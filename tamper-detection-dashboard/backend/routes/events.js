import express from 'express';
import crypto from 'crypto';
import TamperEvent from '../models/TamperEvent.js';

const router = express.Router();

// GET /api/events
router.get('/', async (req, res, next) => {
  try {
    const { deviceId, eventType, status, limit } = req.query;
    const q = {};
    if (deviceId) q.deviceId = deviceId;
    if (eventType) q.eventType = eventType;
    if (status) q.status = status;
    const events = await TamperEvent.find(q).sort({ createdAt: -1 }).limit(Number(limit) || 100);
    res.json(events);
  } catch (err) { next(err); }
});

// GET /api/events/:id
router.get('/:id', async (req, res, next) => {
  try {
    const event = await TamperEvent.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err) { next(err); }
});

// POST /api/events
router.post('/', async (req, res, next) => {
  try {
    const lastEvent = await TamperEvent.findOne().sort({ createdAt: -1 });
    const prevHash = lastEvent?.hash || '';
    const base = `${prevHash}:${req.body.deviceId}-${req.body.reading}-${Date.now()}`;
    const hash = crypto.createHash('sha256').update(base).digest('hex');
    const event = await TamperEvent.create({ ...req.body, hash, prevHash });
    req.app.locals.io.emit('tamper-event', event);
    res.status(201).json(event);
  } catch (err) { next(err); }
});

// PUT /api/events/:id/status
router.put('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const updated = await TamperEvent.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Event not found' });
    res.json(updated);
  } catch (err) { next(err); }
});

// GET /api/events/stats/summary
router.get('/stats/summary', async (req, res, next) => {
  try {
    const total = await TamperEvent.countDocuments();
    const byStatus = Object.fromEntries(
      await Promise.all(['Pending', 'Verified', 'False Positive'].map(async (s) => [s, await TamperEvent.countDocuments({ status: s })]))
    );
    res.json({ total, byStatus });
  } catch (err) { next(err); }
});

// POST /api/events/verify-chain
router.post('/verify-chain', async (req, res, next) => {
  try {
    const events = await TamperEvent.find().sort({ createdAt: 1 });
    let prevHash = '';
    for (const e of events) {
      const recalculated = crypto.createHash('sha256').update(`${prevHash}:${e.deviceId}-${e.reading}-${new Date(e.timestamp).getTime()}`).digest('hex');
      if (recalculated !== e.hash) {
        return res.json({ valid: false, failedAt: e._id });
      }
      prevHash = e.hash;
    }
    res.json({ valid: true, count: events.length });
  } catch (err) { next(err); }
});

// DELETE /api/events/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await TamperEvent.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Event not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;


