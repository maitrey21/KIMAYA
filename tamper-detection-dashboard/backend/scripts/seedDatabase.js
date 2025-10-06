import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Device from '../models/Device.js';
import TamperEvent from '../models/TamperEvent.js';
import crypto from 'crypto';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tamper-detection';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  await Device.deleteMany({});
  await TamperEvent.deleteMany({});

  const devices = [
    { deviceId: 'WS-001', name: 'Digital Scale - Market Plaza', type: 'Digital Scale', location: 'Market Plaza', sector: 'Trade & Retail' },
    { deviceId: 'WB-002', name: 'Weighbridge - Steel Mill', type: 'Weighbridge', location: 'Steel Mill', sector: 'Industrial' },
    { deviceId: 'FD-003', name: 'Fuel Dispenser - Highway Station', type: 'Fuel Dispenser', location: 'Highway Station', sector: 'Transport' },
    { deviceId: 'POS-004', name: 'Payment Terminal - Mall', type: 'Payment Terminal', location: 'Mall', sector: 'Trade & Retail' },
    { deviceId: 'AG-006', name: 'Livestock Scale - Dairy Farm', type: 'Livestock Scale', location: 'Dairy Farm', sector: 'Agriculture' },
    { deviceId: 'WM-006', name: 'Water Meter - Residential', type: 'Water Meter', location: 'Residential', sector: 'Utilities' },
    { deviceId: 'MS-007', name: 'Medical Scale - Hospital', type: 'Medical Scale', location: 'Hospital', sector: 'Healthcare' },
  ].map((d) => ({
    ...d,
    status: 'Normal',
    voltage: 230,
    current: 1.2,
    temperature: 25,
    integrity: 100,
    lastReading: Math.round(50 + Math.random() * 50),
    historicalMean: Math.round(50 + Math.random() * 50),
    firmwareVersion: '1.0.0',
  }));

  const createdDevices = await Device.insertMany(devices);
  console.log(`Seeded ${createdDevices.length} devices`);

  const now = Date.now();
  const sampleEvents = [
    { deviceId: 'WS-001', eventType: 'Physical Tamper', confidence: 92, reading: 150, anomalyScore: 3.1, timestamp: new Date(now - 3600_000) },
    { deviceId: 'FD-003', eventType: 'Digital Spoof', confidence: 88, reading: 5, anomalyScore: 2.8, timestamp: new Date(now - 1800_000) },
    { deviceId: 'POS-004', eventType: 'Calibration Fraud', confidence: 73, reading: 98, anomalyScore: 2.1, timestamp: new Date(now - 600_000) },
  ];

  let prevHash = '';
  for (const e of sampleEvents) {
    const hash = crypto
      .createHash('sha256')
      .update(`${prevHash}:${e.deviceId}-${e.reading}-${e.timestamp.getTime()}`)
      .digest('hex');
    // eslint-disable-next-line no-await-in-loop
    const saved = await TamperEvent.create({ ...e, status: 'Pending', hash, prevHash });
    prevHash = saved.hash;
  }
  console.log('Seeded 3 tamper events');

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});


