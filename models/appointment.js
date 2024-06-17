const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Define the schema for an appointment
const appointmentSchema = new mongoose.Schema({
  appointmentId: { type: String, required: true, default: uuidv4 }, // Appointment ID (mandatory)
  date: { type: Date, required: true }, // Date of the appointment (mandatory)
  patientId: { type: String, required: true }, // Patient ID (mandatory)
  time: { type: String, required: true }, // Time of the appointment (mandatory)
  reason: { type: String, required: true }, // Reason for the appointment (mandatory)
  doctorName: { type: String, required: true }, // Doctor's name (mandatory)
  creationDate: { type: Date, default: Date.now }, // Creation date of the appointment (automatically generated)
  status: { 
    type: String, 
    enum: ['Created', 'Kept', 'Completed', 'Cancelled'], 
    default: 'Created',
    required: true,
  }, // Status of the appointment (mandatory)
});

// Create a model for the Appointment schema
const Appointment = mongoose.model('Appointment', appointmentSchema);

// Export the Appointment model
module.exports = Appointment;
