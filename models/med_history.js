const mongoose = require('mongoose');

// Define the schema for a medical history
const medicalHistorySchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  detectedHealthProblems: { type: String, required: true },
  treatment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  socialSecurityNumber: { type: String, required: true }
});

// Create a model for the medical history schema
const MedicalHistory = mongoose.model('MedicalHistory', medicalHistorySchema);

// Export the MedicalHistory model
module.exports = MedicalHistory;