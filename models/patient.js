const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Define the schema for a patient
const patientSchema = new mongoose.Schema({
  firstName: { type: String, required: true }, // First name of the patient (required)
  lastName: { type: String, required: true }, // Last name of the patient (required)
  socialSecurityNumber: { type: String, required: true }, // Social Security Number of the patient (required)
  dateOfRegistration: { type: Date, default: Date.now }, // Date of registration, auto-generated upon successful registration
  // Add other patient-related fields here if needed
});

// Create a model for the Patient schema
const Patient = mongoose.model('Patient', patientSchema);

// Export the Patient model
module.exports = Patient;


