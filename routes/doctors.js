const express = require('express');
const router = express.Router();
const Doctor = require("../models/doctor");
const {DoctorMiddleware} = require('../middleware/DoctorMiddleware'); 

// POST endpoint to add a new doctor
router.post("/", DoctorMiddleware,async (req, res) => {
  try {
    // Extract required information from the request body
    const { name, specialty } = req.body;

    // Initialize an array to collect validation errors
    const errors = [];

    // Validate presence of required fields
    if (!name) {
      errors.push("Doctor's name is required.");
    }

    if (!specialty) {
      errors.push("Specialty is required.");
    }


    if (name !== undefined && !/^[a-zA-Z\s]*$/.test(name)) {

      errors.push('Invalid name.');
    }
    

    if (specialty !== undefined && !/^[a-zA-Z\s\-\'\,]*$/.test(specialty)) {
      errors.push('Invalid specialty.');
    }




    // If there are any errors, return them
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Create a new doctor with the provided information
    const newDoctor = new Doctor({
      name,
      specialty
    });

    // Save the doctor to the database
    await newDoctor.save();

    // Respond with the created doctor details
    return res.status(201).json(newDoctor);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});




module.exports = router;
