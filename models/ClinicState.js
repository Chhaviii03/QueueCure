const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  token: { type: Number, required: true },
  name: { type: String, default: '' },
  status: {
    type: String,
    enum: ['waiting', 'in_consultation', 'completed', 'skipped'],
    default: 'waiting',
  },
  joinedAt: { type: Date, default: Date.now },
  calledAt: { type: Date },
  completedAt: { type: Date },
});

const consultationRecordSchema = new mongoose.Schema({
  token: { type: Number, required: true },
  durationMinutes: { type: Number, required: true },
  recordedAt: { type: Date, default: Date.now },
});

const clinicStateSchema = new mongoose.Schema({
  _id: { type: String, default: 'singleton' },
  currentToken: { type: Number, default: null },
  nextTokenNumber: { type: Number, default: 1 },
  manualAvgMinutes: { type: Number, default: null },
  patients: [patientSchema],
  consultationHistory: [consultationRecordSchema],
  lastUpdated: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ClinicState', clinicStateSchema);
