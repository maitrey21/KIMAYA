import mongoose from 'mongoose';

const TamperEventSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true },
    eventType: {
      type: String,
      enum: ['Physical Tamper', 'Firmware Tamper', 'Calibration Fraud', 'Digital Spoof', 'Magnetic Attack'],
      required: true,
    },
    confidence: { type: Number, min: 0, max: 100, required: true },
    reading: { type: Number, required: true },
    anomalyScore: { type: Number, required: true },
    hash: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Verified', 'False Positive'], default: 'Pending' },
    timestamp: { type: Date, default: Date.now },
    prevHash: { type: String },
  },
  { timestamps: true }
);

const TamperEvent = mongoose.model('TamperEvent', TamperEventSchema);
export default TamperEvent;


