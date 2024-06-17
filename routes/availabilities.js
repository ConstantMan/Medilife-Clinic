const express = require('express');
const fileUpload = require('express-fileupload');
const csv = require('csv-parser');
const fs = require('fs');
const Doctor = require('../models/doctor'); // Corrected path
const DoctorAvailability = require('../models/availability'); // Corrected path
const router = express.Router();
const {DoctorMiddleware} = require('../middleware/DoctorMiddleware'); 

router.use(fileUpload());


router.post('/upload-doctor-availability-csv/:doctorId', DoctorMiddleware, async (req, res) => {

    try {
        const { doctorId } = req.params;

        // Check if the doctor exists by ID
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ error: { message: "Doctor not found" } });
        }

        if (!req.files || !req.files.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const file = req.files.file;
        const filePath = './uploads/' + file.name;

        // Move the uploaded file to the server
        file.mv(filePath, async (err) => {
            if (err) {
                console.error("Error saving file:", err);
                return res.status(500).send('Error saving file');
            }

            // Array to collect all slots
            let slotsArray = [];

            // Process the CSV file
            try {
                fs.createReadStream(filePath)
                    .pipe(csv({ separator: ';' })) // Parsing CSV with ';' separator
                    .on('data', (data) => {
                        try {
                            const slot = data.slots;

                            // Validate the slot data
                            if (!slot) {
                                console.error("Invalid slot data:", data);
                                return;
                            }

                            // Add the slot to the array
                            slotsArray.push({ datetime: slot });
                        } catch (err) {
                            console.error("Error processing slot data:", err);
                        }
                    })
                    .on('end', async () => {
                        try {
                            // Create a new DoctorAvailability instance
                            const newAvailability = new DoctorAvailability({
                                doctor: doctorId,
                                slots: slotsArray
                            });

                            // Save the new availability to the database
                            await newAvailability.save();

                            console.log("Doctor availability saved:", newAvailability);
                            res.status(200).send('File successfully uploaded and doctor availability saved');
                        } catch (error) {
                            console.error("Error saving doctor availability:", error);
                            res.status(500).send('Error saving doctor availability');
                        } finally {
                            // Delete the uploaded file from the server
                            fs.unlink(filePath, (err) => {
                                if (err) console.error('Error removing file:', err);
                            });
                        }
                    });
            } catch (error) {
                console.error("Error processing CSV file:", error);
                res.status(500).send('Error processing CSV file');
            }
        });
    } catch (error) {
        console.error("Error uploading file:", error);
        res.status(500).send('Error uploading file');
    }
});


// POST endpoint to add a new doctor availability

router.post("/:doctorId", DoctorMiddleware, async (req, res) => {

    try {
        const { slots } = req.body;
        const { doctorId } = req.params;

        // Debugging log: Check the request body
        console.log("Request body:", req.body);

        // Validate the request body
        if (!slots || !Array.isArray(slots) || slots.length === 0) {
            // Debugging log: Log the invalid request body
            console.log("Invalid request body:", req.body);
            return res.status(400).json({ error: "Invalid request body" });
        }

        // Check if the doctor exists by ID
        const doctor = await Doctor.findById(doctorId);

        // Debugging log: Log the doctor ID and found doctor (if any)
        console.log("Doctor ID:", doctorId);
        console.log("Found doctor:", doctor);

        if (!doctor) {
            // Debugging log: Log the error message
            console.log("Doctor not found for ID:", doctorId);
            return res.status(404).json({ error: { message: "Doctor not found" } });
        }

        // Create a new DoctorAvailability instance
        const newAvailability = new DoctorAvailability({
            doctor: doctorId, // Store doctor ID
            slots: slots.map(slot => ({ datetime: slot }))
        });

        // Save the new availability to the database
        await newAvailability.save();

        // Debugging log: Log the created doctor availability
        console.log("Created doctor availability:", newAvailability);

        // Respond with the created doctor availability
        return res.status(201).json(newAvailability);
    } catch (error) {
        // Debugging log: Log any unhandled errors
        console.error("Unhandled error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// PATCH endpoint to update doctor availability
router.patch("/:doctorId/update", DoctorMiddleware, async (req, res) => {

    try {
        const { slots } = req.body;
        const { doctorId } = req.params;

        // Validate the request body
        if (!slots || !Array.isArray(slots) || slots.length === 0) {
            return res.status(400).json({ error: "Invalid request body" });
        }

        // Check if the doctor exists by ID
        const doctor = await Doctor.findById(doctorId);

        if (!doctor) {
            return res.status(404).json({ error: { message: "Doctor not found" } });
        }

        // Find the existing doctor availability
        let doctorAvailability = await DoctorAvailability.findOne({ doctor: doctorId });

        // If doctor availability doesn't exist, create a new one
        if (!doctorAvailability) {
            doctorAvailability = new DoctorAvailability({
                doctor: doctorId,
                slots: []
            });
        }


        // Validate and correct the date format for each slot
        const validatedSlots = slots.map(slot => {
            // Check if the slot is a valid date
            const date = new Date(slot);
            if (isNaN(date.getTime())) {
                throw new Error(`Invalid date format: ${slot}`);
            }
            return { datetime: date };
        });

        // Update availability slots
        doctorAvailability.slots = validatedSlots;


        // Save the updated availability to the database
        await doctorAvailability.save();

        // Respond with the updated doctor availability
        return res.status(200).json(doctorAvailability);
    } catch (error) {
        console.error("Unhandled error:", error);
        if (error.message.includes('Invalid date format')) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: "Internal Server Error" });
    }
});


module.exports = router;
