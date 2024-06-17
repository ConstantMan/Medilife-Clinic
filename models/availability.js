const mongoose = require('mongoose');

// Define DoctorAvailability schema
const DoctorAvailabilitySchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  slots: [
    {
      datetime: {
        type: Date,
        required: true
      }
    }
  ]
});

// Create DoctorAvailability model
const DoctorAvailability = mongoose.model('DoctorAvailability', DoctorAvailabilitySchema);

module.exports = DoctorAvailability;
