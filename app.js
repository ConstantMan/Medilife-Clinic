const express = require('express');
const mongoose = require('mongoose');
const PatientsRoutes = require('./routes/patients');
const MedicalHistoriesRoutes = require('./routes/med_histories');
const MedicalHistoriesRegistrationsRoutes = require('./routes/med_histories_registrations');
const DoctorsRoutes = require('./routes/doctors');
const AppointmentsRoutes = require('./routes/appointments');
const UserRoutes = require('./routes/users');
const AvailabilityRoutes = require('./routes/availabilities');

const app = express();

mongoose.set("strictQuery", false);

mongoose
  .connect("mongodb://127.0.0.1:27017/kliniki1")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("Mongo err", err));

mongoose.Promise = global.Promise;

// Init Middleware
app.use(express.json({ extended: false }));
app.use(express.urlencoded({ extended: true }));




// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


// Define routes for different resources
app.use('/patients', PatientsRoutes);
app.use('/med_histories', MedicalHistoriesRoutes);
app.use('/med_histories_registrations', MedicalHistoriesRegistrationsRoutes);
app.use('/doctors', DoctorsRoutes);
app.use('/appointments', AppointmentsRoutes);
app.use('/users', UserRoutes);
app.use('/availabilities', AvailabilityRoutes);
// Middleware for handling 404 errors
app.use((req, res, next) => {
  const error = new Error('Not found');
  error.status = 404;
  next(error);

});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

module.exports = app;
