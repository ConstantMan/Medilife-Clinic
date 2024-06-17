const express = require('express');
const router = express.Router();
const Patient = require('../models/patient'); 
const Med_histories = require('../models/med_history'); 
const Appointment = require('../models/appointment');
const Doctor = require ('../models/doctor');
const {PatientMiddleware} = require('../middleware/PatientMiddleware'); 
const {SecretaryMiddleware} = require('../middleware/SecretaryMiddleware');
const {DoctorMiddleware} = require('../middleware/DoctorMiddleware');
const { v4: uuidv4 } = require('uuid');
const ObjectId = require('mongoose').Types.ObjectId;
const moment = require('moment');


router.post('/',async (req, res) => {
  try {
    // Check if the required information is provided in the request body
    const { socialSecurityNumber, firstName, lastName, appointmentDate, appointmentTime, reason, doctorName } = req.body;
    console.table(req.body)
    // Initialize an array to collect validation errors
    const errors = [];

    // Ensure socialSecurityNumber, firstName, lastName, appointmentDate, appointmentTime, reason, and doctorName are provided
    if (!socialSecurityNumber) errors.push('Social Security Number is required.');
    if (!firstName) errors.push('First name is required.');
    if (!lastName) errors.push('Last name is required.');
    if (!appointmentDate) errors.push('Appointment date is required.');
    if (!appointmentTime) errors.push('Appointment time is required.');
    if (!reason) errors.push('Reason for the appointment is required.');
    if (!doctorName) errors.push('Doctor name is required.');
    
    // Validate format and length of Social Security Number
    // if (socialSecurityNumber && (socialSecurityNumber.length !== 11 || /[^0-9]/.test(socialSecurityNumber))) {
    //   errors.push('Invalid Social Security Number.');
    // }

    if (firstName !== undefined && !/^[a-zA-Z]*$/.test(firstName)) {
      errors.push('Invalid Firstname.');
    }

    if (lastName !== undefined && !/^[a-zA-Z]*$/.test(lastName)) {
      errors.push('Invalid Lastname.');
    }
    if (doctorName !== undefined && !/^[a-zA-Z\s]*$/.test(doctorName)) {

      errors.push('Invalid Doctorname.');
    }
    

    // If there are any errors, return them
    if (errors.length > 0) return res.status(400).json({ errors });

    // Check if the patient with the provided socialSecurityNumber already exists
    let patient = await Patient.findOne({ socialSecurityNumber });
    if (!patient) {
      // Create a new patient if they do not exist
      patient = new Patient({
        socialSecurityNumber,
        firstName,
        lastName
      });
      await patient.save();
    }

    // Check if the doctor is available at the given date and time
    const isAvailable = await checkDoctorAvailability(doctorName, appointmentDate, appointmentTime);
    if (!isAvailable) {
      return res.status(400).json({ error: 'The doctor is not available at the requested time.' });
    }

    // Create a new appointment
    const newAppointment = new Appointment({
      appointmentId: uuidv4(),
      patientId: patient._id,
      date: appointmentDate,
      time: appointmentTime,
      reason,
      doctorName,
      status: 'Created'
    });

    // Save the appointment to the database
    await newAppointment.save();

    // Respond with the created appointment details
    return res.status(201).json(newAppointment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Function to check doctor's availability
async function checkDoctorAvailability(doctorName, date, time) {
  // Query the database to check if the doctor has an appointment at the given date and time
  const existingAppointment = await Appointment.findOne({ doctorName, date, time });
  
  // If an appointment exists, the doctor is not available
  if (existingAppointment) {
    return false;
  }
  
  // Otherwise, the doctor is available
  return true;
}

// Route to update an existing appointment
router.put('/:appointmentId', DoctorMiddleware,PatientMiddleware, SecretaryMiddleware,async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { date, time, status } = req.body;

    const updateData = {};
    if (date) updateData.date = date;
    if (time) updateData.time = time;
    if (status) updateData.status = status;

    // Ensure that the new date and time are available for the doctor
    if (date || time) {
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

      const isAvailable = await checkDoctorAvailability(appointment.doctorName, date || appointment.date, time || appointment.time);
      if (!isAvailable) {
        return res.status(400).json({ error: 'The doctor is not available at the requested time.' });
      }
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(appointmentId, updateData, { new: true });
    if (!updatedAppointment) return res.status(404).json({ error: 'Appointment not found' });

    return res.status(200).json(updatedAppointment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Function to check doctor's availability
async function checkDoctorAvailability(doctorName, date, time) {
  const existingAppointment = await Appointment.findOne({ doctorName, date, time });
  return !existingAppointment;
}


// Route to cancel an appointment
router.patch('/:appointmentId/cancel',DoctorMiddleware, PatientMiddleware, SecretaryMiddleware, async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status: 'Cancelled' },
      { new: true }
    );

    if (!updatedAppointment) return res.status(404).json({ error: 'Appointment not found' });

    return res.status(200).json(updatedAppointment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Function to check doctor's availability
async function checkDoctorAvailability(doctorName, date, time) {
  const existingAppointment = await Appointment.findOne({ doctorName, date, time });
  return !existingAppointment;
}
router.delete('/cancel/:id',DoctorMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    // Find the appointment by ID
    const appointment = await Appointment.findById(id);

    // Check if the appointment exists and if its status is "Cancelled"
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    if (appointment.status !== "Cancelled") {
      return res.status(400).json({ message: "Appointment can only be deleted if it is in 'Cancelled' status" });
    }

    // Delete the appointment
    await Appointment.deleteOne({ _id: id });

    res.json({ message: "Appointment has been successfully deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Route to display details of a specific appointment
router.get('/:id',DoctorMiddleware, PatientMiddleware, SecretaryMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    // Find the appointment by ID
    const appointment = await Appointment.findById(id);

    // Check if the appointment exists
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Respond with the appointment details
    return res.status(200).json(appointment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});




module.exports = router;