import mongoose from 'mongoose';

const DeviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'Digital Scale',
        'Weighbridge',
        'Fuel Dispenser',
        'Payment Terminal',
        'Livestock Scale',
        'Water Meter',
        'Medical Scale',
      ],
      required: true,
    },
    location: { type: String, required: true },
    sector: {
      type: String,
      enum: ['Trade & Retail', 'Industrial', 'Healthcare', 'Agriculture', 'Transport', 'Utilities'],
      required: true,
    },
    status: { type: String, enum: ['Normal', 'Tampered', 'Suspicious', 'Offline'], default: 'Normal' },
    voltage: { type: Number, default: 0 },
    current: { type: Number, default: 0 },
    temperature: { type: Number, default: 0 },
    integrity: { type: Number, min: 0, max: 100, default: 100 },
    lastReading: { type: Number, default: 0 },
    historicalMean: { type: Number, default: 1 },
    hash: { type: String },
    firmwareVersion: { type: String, default: '1.0.0' },
  },
  { timestamps: true }
);

const Device = mongoose.model('Device', DeviceSchema);
export default Device;


