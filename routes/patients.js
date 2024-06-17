const express = require("express");
const User  = require('../models/user');
const multer = require("multer");
const csv = require("csv-parser");
const xlsx = require("xlsx");
const Patient = require("../models/patient");
const Med_histories = require("../models/med_history");
const Appointment = require("../models/appointment");
const {PatientMiddleware} = require('../middleware/PatientMiddleware'); 
const {DoctorMiddleware} = require('../middleware/DoctorMiddleware'); 
const {SecretaryMiddleware} = require('../middleware/SecretaryMiddleware'); 


const fs = require("fs");
const path = require("path");
const app = express();
const fileUpload = require('express-fileupload');
const router = express.Router();

router.use(fileUpload());
router.post('/upload-csv', DoctorMiddleware, async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.files.file;
    const filePath = './uploads/' + file.name;

    file.mv(filePath, async (err) => {
      if (err) {
        console.error("Error saving file:", err);
        return res.status(500).send('Error saving file');
      }

      try {
        const results = [];

        fs.createReadStream(filePath)
          .pipe(csv({ separator: ';' })) // Parsing CSV with ';' separator
          .on('data', async (data) => {
            try {
              const { firstname, lastname, socialSecurityNumber } = data;
              const errors = [];

              if (!firstname) errors.push("First name is required.");
              if (!lastname) errors.push("Last name is required.");
              if (!socialSecurityNumber) errors.push("Social Security Number is required.");

              if (errors.length > 0) {
                console.error("Validation errors:", errors);
                return;
              }

              const existingPatient = await Patient.findOne({ socialSecurityNumber });
              if (existingPatient) {
                console.error("Duplicate Social Security Number found:", socialSecurityNumber);
                return;
              }

              const newPatient = new Patient({ firstName: firstname, lastName: lastname, socialSecurityNumber });
              await newPatient.save();
              console.log("Patient saved:", newPatient);
            } catch (err) {
              console.error("Error saving patient:", err);
            }
          })
          .on('end', () => {
            console.log("CSV file successfully processed.");
            res.status(200).send('File successfully uploaded and data saved');
          });
      } catch (error) {
        console.error("Error processing CSV file:", error);
        res.status(500).send('Error processing CSV file');
      } finally {
        fs.unlink(filePath, (err) => {
          if (err) console.error('Error removing file:', err);
        });
      }
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).send('Error uploading file');
  }
});

router.post("/", DoctorMiddleware,async (req, res) => {

  try {
    // Extract required information from the request body
    const { socialSecurityNumber, firstName, lastName } = req.body;

    // Initialize an array to collect validation errors
    const errors = [];

    // Validate presence of required fields
    if (!socialSecurityNumber) {
      errors.push("Social Security Number is required.");
    }

    if (!firstName) {
      errors.push("Firstname is required.");
    }

    if (!lastName) {
      errors.push("Lastname is required.");
    }

    // Validate format and length of Social Security Number
    if (
      socialSecurityNumber &&
      (socialSecurityNumber.length !== 11 ||
        /[^0-9]/.test(socialSecurityNumber))
    ) {
      errors.push("Invalid Social Security Number.");
    }

    if (firstName !== undefined && !/^[a-zA-Z]*$/.test(firstName)) {
      errors.push("Invalid Firstname.");
    }

    if (lastName !== undefined && !/^[a-zA-Z]*$/.test(lastName)) {
      errors.push("Invalid Lastname.");
    }

    // If there are any errors, return them
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Check if the patient with the provided socialSecurityNumber already exists
    const existingPatient = await Patient.findOne({ socialSecurityNumber });
    if (existingPatient) {
      return res.status(400).json({
        error: "A patient with this Social Security Number already exists.",
      });
    }

    // Create a new patient with the provided information
    const newPatient = new Patient({
      socialSecurityNumber,
      firstName,
      lastName,
    });

    // Save the patient to the database
    await newPatient.save();

    // Respond with the created patient details
    return res.status(201).json(newPatient);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    console.log(`Received delete request for patient ID: ${id}`);

    // Validate ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      console.log("Invalid patient ID format:", id);
      return res.status(400).json({ error: "Invalid patient ID format." });
    }

    // Find the patient by id
    const patient = await Patient.findById(id);
    console.log("Patient found:", patient);

    // Check if the patient exists
    if (!patient) {
      console.log("Patient not found");
      return res.status(404).json({ error: "Patient not found." });
    }

    // Delete the patient
    await patient.deleteOne();
    console.log("Patient successfully deleted");

    // Return success message
    res.json({ message: "Patient successfully deleted." });
  } catch (error) {
    console.error("Error deleting patient:", error); // Detailed error logging
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/:socialSecurityNumber", async (req, res) => {
  const { socialSecurityNumber } = req.params;

  try {
    console.log(
      `Received update request for patient with socialSecurityNumber: ${socialSecurityNumber}`
    );

    // Validate socialSecurityNumber format
    const socialSecurityNumberRegex = /^\d{11}$/; // Updated regex for socialSecurityNumber format without dashes
    if (!socialSecurityNumberRegex.test(socialSecurityNumber)) {
      console.log("Invalid socialSecurityNumber format:", socialSecurityNumber);
      return res
        .status(400)
        .json({ error: "Invalid social security number format." });
    }

    // Find the patient by socialSecurityNumber
    const patient = await Patient.findOne({
      socialSecurityNumber: socialSecurityNumber,
    });
    console.log("Patient found:", patient);

    // Check if the patient exists
    if (!patient) {
      console.log("Patient not found");
      return res.status(404).json({ error: "Patient not found." });
    }

    // Update the patient's fields if provided and validate the values
    const updates = req.body;
    console.log("Updates received:", updates);

    if (updates) {
      if (updates.firstName) {
        patient.firstName = updates.firstName;
      }
      if (updates.lastName) {
        patient.lastName = updates.lastName;
      }
    }

    // Ensure the registration date is not changed
    patient.dateOfRegistration = patient.dateOfRegistration || new Date();

    // Save the updated patient
    const updatedPatient = await patient.save();
    console.log("Patient successfully updated:", updatedPatient);

    // Return the updated patient
    res.json(updatedPatient);
  } catch (error) {
    console.error("Error updating patient:", error); // Detailed error logging
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route for displaying all information about a patient
router.get("/display/:socialSecurityNumber", async (req, res) => {
  const { socialSecurityNumber } = req.params;

  try {
    // Check if socialSecurityNumber is provided
    if (!socialSecurityNumber) {
      return res.status(400).json({ error: "Social Security Number is required." });
    }

    // Find the patient by socialSecurityNumber
    const patient = await Patient.findOne({ socialSecurityNumber });

    // Check if the patient exists
    if (!patient) {
      return res.status(404).json({ error: "Patient not found." });
    }

    // Return all information about the patient
    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
module.exports = router;
