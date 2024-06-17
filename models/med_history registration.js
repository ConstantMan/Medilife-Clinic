const mongoose = require('mongoose');

// Define the schema for a history record
const historyRecordSchema = new mongoose.Schema({
  recordId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Record ID (mandatory)
  creationDate: { type: Date, default: Date.now }, // Date of creation (automatically generated)
  detectedHealthProblems: { type: String, required: true }, // Detected health problems (mandatory)
  treatment: { type: String, required: true }, // Treatment (mandatory)
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true }, // Patient's identifier (mandatory)
});

// Create a model for the history record schema
const HistoryRecord = mongoose.model('HistoryRecord', historyRecordSchema);

// Export the HistoryRecord model
module.exports = HistoryRecord;
