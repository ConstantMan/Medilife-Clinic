// Import required modules and models
const csv = require('csv-parser');
const fs = require('fs');
const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const pdfkit = require('pdfkit');
const MedicalHistory = require('../models/med_history');
const Patient = require('../models/patient');
const {DoctorMiddleware} = require('../middleware/DoctorMiddleware'); 
const mongoose = require('mongoose');

const fileUpload = require('express-fileupload');
// Endpoint for creating a new medical history
const path = require('path');

// Endpoint for creating a new medical history
router.post('/', DoctorMiddleware,async (req, res) => {

  try {
    const { socialSecurityNumber, detectedHealthProblems, treatment } = req.body;

    // Ensure socialSecurityNumber, detected health problems, and treatment are provided
    if (!socialSecurityNumber) {
      return res.status(400).json({ error: 'Social Security Number is required.' });
    }

    if (!detectedHealthProblems) {
      return res.status(400).json({ error: 'Detected health problems are required.' });
    }

    if (!treatment) {
      return res.status(400).json({ error: 'Treatment is required.' });
    }

    // Check if the patient exists using socialSecurityNumber
    const patient = await Patient.findOne({ socialSecurityNumber });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found. Please check your social security number!' });
    }

    
    // Create a new medical history
    const newMedicalHistory = new MedicalHistory({
      patient: patient._id, // Use the found patient's _id
      socialSecurityNumber,
      detectedHealthProblems,
      treatment
    });

    // Save the medical history to the database
    await newMedicalHistory.save();

    // Respond with the created medical history details
    return res.status(201).json(newMedicalHistory);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});
  
router.use(fileUpload());

router.post('/upload-patient-history-csv', DoctorMiddleware, async (req, res) => {

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
        fs.createReadStream(filePath)
          .pipe(csv({ separator: ';' })) // Parsing CSV with ';' separator
          .on('data', async (data) => {
            try {
              const { socialSecurityNumber, detectedHealthProblems, treatment } = data;
              const errors = [];

              if (!socialSecurityNumber) errors.push("Social Security Number is required.");
              if (!detectedHealthProblems) errors.push("Detected health problems are required.");
              if (!treatment) errors.push("Treatment is required.");

              if (errors.length > 0) {
                console.error("Validation errors:", errors);
                return;
              }

              // Find the patient by social security number
              const patient = await Patient.findOne({ socialSecurityNumber });
              if (!patient) {
                console.error("Patient not found:", socialSecurityNumber);
                return;
              }

             
              const newHistory = new MedicalHistory({
                patient: patient._id,
                socialSecurityNumber,
                detectedHealthProblems,
                treatment,
                createdAt: new Date()
              });
              await newHistory.save();
              console.log("Patient history saved:", newHistory);
            } catch (err) {
              console.error("Error saving patient history:", err);
            }
          })
          .on('end', () => {
            console.log("CSV file successfully processed.");
            res.status(200).send('File successfully uploaded and patient history saved');
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

// Download patient history in PDF format

router.get('/download-patient-history/pdf/:patientId',DoctorMiddleware, async (req, res) => {

  try {
    const { patientId } = req.params;

    // Find the patient and their medical history
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ error: { message: "Patient not found" } });
    }
    const histories = await MedicalHistory.find({ patient: patientId });

    // Create a new PDF document
    const doc = new pdfkit();
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Disposition', `attachment; filename=patient_history_${patientId}.pdf`);
      res.setHeader('Content-Type', 'application/pdf');
      res.send(pdfData);
    });
    doc.font('Helvetica');

    // Define the path to the image file
    const imagePath = path.join(__dirname, 'logo.png'); // Adjust the path to your image file


    // Add the image to the PDF document (at the top)
    doc.image(imagePath, {
      fit: [100, 100], // Adjust the size of the image as needed
      align: 'center', // Align the image to the center
      valign: 'middle' // Align the image vertically in the middle of the page
    });

    // Add header with the current date and time
    const currentDate = new Date().toLocaleString('en-US', { timeZone: 'UTC' });
    doc.fontSize(18).text('Patient History', { align: 'center' });
    doc.fontSize(12).text(`Generated on: ${currentDate}`, { align: 'center' });
    doc.moveDown();
    //doc.fontSize(16).text(`${patient.name} ${patient.surname} (${patient.socialSecurityNumber})`, { align: 'center' });
    doc.moveDown();

    // Add content to the PDF
    histories.forEach(history => {
      doc.fontSize(14).text(`\n\n\n\nSocial Security Number: ${history.socialSecurityNumber}`);
      doc.text(`Detected Health Problems: ${history.detectedHealthProblems}`);
      doc.text(`Treatment: ${history.treatment}`);
      doc.text(`Created At: ${new Date(history.createdAt).toLocaleString('en-US', { timeZone: 'UTC' })}`);
      doc.moveDown();
    });

    // Add footer text
    doc.fontSize(10)
      .text('Genetral Medical Center "Aigaio" , Tel. : 22730-14859 , email : aegean@gmail.com , fax : 254 478 2458', {
        align: 'center',
        valign: 'bottom'
      });

    // Finalize the PDF
    doc.end();

  } catch (error) {
    console.error("Error downloading patient history:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// Download patient history in Excel format
router.get('/download-patient-history/excel/:patientId',DoctorMiddleware, async (req, res) => {

  try {
      const { patientId } = req.params;

      // Find the patient and their medical history
      const patient = await Patient.findById(patientId);
      if (!patient) {
          return res.status(404).json({ error: { message: "Patient not found" } });
      }
      const histories = await MedicalHistory.find({ patient: patientId });

      // Create a new workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Patient History');

      // Add headers
      worksheet.columns = [
          { header: 'Social Security Number', key: 'socialSecurityNumber', width: 20 },
          { header: 'Detected Health Problems', key: 'detectedHealthProblems', width: 30 },
          { header: 'Treatment', key: 'treatment', width: 30 },
          { header: 'Created At', key: 'createdAt', width: 20 }
      ];

      // Add rows
      histories.forEach(history => {
          worksheet.addRow({
              socialSecurityNumber: history.socialSecurityNumber,
              detectedHealthProblems: history.detectedHealthProblems,
              treatment: history.treatment,
              createdAt: history.createdAt
          });
      });

      // Write to a buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set the response headers and send the buffer
      res.setHeader('Content-Disposition', `attachment; filename=patient_history_${patientId}.xlsx`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);

  } catch (error) {
      console.error("Error downloading patient history:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});



// Export the router
module.exports = router;