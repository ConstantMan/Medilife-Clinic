const mongoose = require('mongoose');

// Define the schema for a doctor
const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Doctor's name (mandatory)
  specialty: { type: String, required: true }, // Doctor's specialty (mandatory)
  
});

// Create a model for the Doctor schema
const Doctor = mongoose.model('Doctor', doctorSchema);

// Export the Doctor model
module.exports = Doctor;
