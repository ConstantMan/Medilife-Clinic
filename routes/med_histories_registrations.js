const express = require("express");
const router = express.Router();
const MedicalHistory = require("../models/med_history");
const Patient = require("../models/patient.js");
const { DoctorMiddleware } = require('../middleware/DoctorMiddleware'); 
const { PatientMiddleware } = require('../middleware/PatientMiddleware'); 

router.patch("/:ssn", DoctorMiddleware, async (req, res) => {
  try {
    const { ssn } = req.params;
    const { detectedHealthProblems, treatment } = req.body;

    // Ensure at least one field to update is provided
    if (!detectedHealthProblems && !treatment) {
      return res.status(400).json({ error: "At least one field is required to update." });
    }

    // Find the existing medical history record by SSN
    const medicalHistory = await MedicalHistory.findOne({ socialSecurityNumber: ssn });
    if (!medicalHistory) {
      return res.status(404).json({ error: "Medical history record not found." });
    }

    // Update the fields if they are provided
    if (detectedHealthProblems) {
      medicalHistory.detectedHealthProblems = detectedHealthProblems;
    }
    if (treatment) {
      medicalHistory.treatment = treatment;
    }

    // Save the updated medical history to the database
    await medicalHistory.save();

    // Respond with the updated medical history details
    return res.status(200).json(medicalHistory);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/delete/:ssn", DoctorMiddleware, async (req, res) => {
  const { ssn } = req.params;

  try {
    console.log(`Attempting to delete history for patient with ID: ${ssn}`);

    // Find patient by SSN
    const patient = await Patient.findOne({ socialSecurityNumber: ssn });

    console.table(patient);

    if (!patient) {
      console.log(`Patient with ID: ${ssn} not found`);
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the most recent medical history record by SSN
    const removedRecord = await MedicalHistory.findOneAndDelete({ socialSecurityNumber: ssn });

    if (!removedRecord) {
      console.log(`No history records found for patient with SSN: ${ssn}`);
      return res.status(404).json({ message: "No history records found for the patient" });
    }

    console.log(`Most recent history record for patient with ID: ${ssn} has been deleted`);
    res.json({
      message: "Most recent history record has been deleted",
      deletedRecord: removedRecord,
    });
  } catch (error) {
    console.error(`Error deleting history for patient with ID: ${ssn}: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

// Route to get the latest medical history registration for a patient
router.get("/:socialSecurityNumber",DoctorMiddleware,async (req, res) => {
  const  socialSecurityNumber  = req.params.socialSecurityNumber;


    // Find the patient by social security number
    const patient = await Patient.findOne({
      socialSecurityNumber: socialSecurityNumber,
    });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const find_med_history =  await MedicalHistory.findOne({socialSecurityNumber:socialSecurityNumber})
    // Ensure the history field exists and is an array
    if (!find_med_history) {
      return res
        .status(404)
        .json({ message: "No history records found for the patient" });
    }

    // Get the most recent history record (assuming the latest entry is the last one in the array)


   return res.send(find_med_history);

}
);
// Route to get the latest medical history registration for a patient
router.get("/:socialSecurityNumber",DoctorMiddleware,async (req, res) => {
  const  socialSecurityNumber  = req.params.socialSecurityNumber;


    // Find the patient by social security number
    const patient = await Patient.findOne({
      socialSecurityNumber: socialSecurityNumber,
    });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const find_med_history =  await MedicalHistory.findOne({socialSecurityNumber:socialSecurityNumber})
    // Ensure the history field exists and is an array
    if (!find_med_history) {
      return res
        .status(404)
        .json({ message: "No history records found for the patient" });
    }

    // Get the most recent history record (assuming the latest entry is the last one in the array)


   return res.send(find_med_history);

}
);
// Export the router
module.exports = router;
