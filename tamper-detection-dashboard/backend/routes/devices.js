import express from 'express';
import crypto from 'crypto';
import Device from '../models/Device.js';
import TamperEvent from '../models/TamperEvent.js';

const router = express.Router();

function calculateZScore(currentReading, historicalMean) {
  const denom = historicalMean * 0.1 || 0.1;
  return Math.abs((currentReading - historicalMean) / denom);
}

function determineStatusFromZ(z) {
  if (z > 2.5) return 'Tampered';
  if (z > 1.5) return 'Suspicious';
  return 'Normal';
}

// GET /api/devices
router.get('/', async (req, res, next) => {
  try {
    const devices = await Device.find().sort({ name: 1 });
    res.json(devices);
  } catch (err) { next(err); }
});

// GET /api/devices/:id
router.get('/:id', async (req, res, next) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    res.json(device);
  } catch (err) { next(err); }
});

// POST /api/devices
router.post('/', async (req, res, next) => {
  try {
    const device = await Device.create(req.body);
    res.status(201).json(device);
  } catch (err) { next(err); }
});

// PUT /api/devices/:id/reading
router.put('/:id/reading', async (req, res, next) => {
  try {
    const { reading } = req.body;
    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ error: 'Device not found' });

    const z = calculateZScore(reading, device.historicalMean || 1);
    const status = determineStatusFromZ(z);
    const timestamp = Date.now();
    const hash = crypto.createHash('sha256').update(`${device.deviceId}-${reading}-${timestamp}`).digest('hex');

    device.lastReading = reading;
    device.status = status;
    device.hash = hash;
    // simple moving towards reading
    device.historicalMean = device.historicalMean * 0.9 + reading * 0.1;
    await device.save();

    const io = req.app.locals.io;
    io.emit('device-update', { deviceId: device.deviceId, status, reading, zScore: z, timestamp, hash });

    if (status === 'Tampered' || status === 'Suspicious') {
      const lastEvent = await TamperEvent.findOne().sort({ createdAt: -1 });
      const prevHash = lastEvent?.hash || '';
      const eventHash = crypto.createHash('sha256').update(`${prevHash}:${device.deviceId}-${reading}-${timestamp}`).digest('hex');
      const event = await TamperEvent.create({
        deviceId: device.deviceId,
        eventType: status === 'Tampered' ? 'Physical Tamper' : 'Calibration Fraud',
        confidence: Math.min(100, Math.round((z / 3.5) * 100)),
        reading,
        anomalyScore: z,
        hash: eventHash,
        status: 'Pending',
        timestamp,
        prevHash,
      });
      io.emit('device-alert', { deviceId: device.deviceId, status, event });
      io.emit('tamper-event', event);
    }

    res.json({ device, zScore: z });
  } catch (err) { next(err); }
});

// POST /api/devices/:id/simulate-tamper
router.post('/:id/simulate-tamper', async (req, res, next) => {
  try {
    const { tamperType, intensity } = req.body;
    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ error: 'Device not found' });

    let newReading = device.lastReading || device.historicalMean || 1;
    let integrity = device.integrity;
    let firmwareVersion = device.firmwareVersion;

    switch (tamperType) {
      case 'Physical':
        newReading = newReading * (1 + (intensity || 0.75)); // +50-100%
        break;
      case 'Firmware':
        integrity = 15;
        firmwareVersion = `${device.firmwareVersion}-compromised`;
        break;
      case 'Calibration':
        newReading = newReading * (1 + (intensity || 0.25)); // +20-30%
        break;
      case 'Magnetic':
        newReading = newReading * (1 - (intensity || 0.4)); // -30-50%
        break;
      case 'Digital':
        newReading = Math.max(0, Math.round(Math.random() * (device.historicalMean * 3)));
        integrity = 10;
        break;
      default:
        return res.status(400).json({ error: 'Invalid tamperType' });
    }

    req.body.reading = newReading; // reuse update flow
    device.integrity = integrity;
    device.firmwareVersion = firmwareVersion;
    await device.save();

    // Delegate to reading update
    req.params.id = device._id.toString();
    return router.handle({ ...req, method: 'PUT', url: `/${device._id}/reading` }, res, next);
  } catch (err) { next(err); }
});

// GET /api/devices/:id/analytics
router.get('/:id/analytics', async (req, res, next) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    // Mock last 50 readings around historicalMean
    const readings = Array.from({ length: 50 }, () =>
      Math.max(0, device.historicalMean + (Math.random() - 0.5) * device.historicalMean * 0.2)
    );
    res.json({ readings, historicalMean: device.historicalMean });
  } catch (err) { next(err); }
});

// DELETE /api/devices/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await Device.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Device not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;


