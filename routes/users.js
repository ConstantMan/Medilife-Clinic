const express = require("express");
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const User = require('../models/user');
const { PatientMiddleware } = require('../middleware/PatientMiddleware');
const { DoctorMiddleware } = require('../middleware/DoctorMiddleware');
const {SecretaryMiddleware} = require('../middleware/DoctorMiddleware'); 

const app = express();
app.use(bodyParser.json());

// This would simulate token storage
let tokens = [];
// Signup route to create a new user
router.post("/signup", (req, res, next) => {
  console.log("Request Body:", req.body); // Add this line for debugging

  const {
      _id,
      username,
      password,
      email,
      firstName,
      lastName,
      socialSecurityNumber,
      IDNumber,
      roles,
      specialty
  } = req.body;

  // Initialize an array to collect validation errors
  const errors = [];

  // Validate username
  if (username !== undefined && !/^[a-zA-Z0-9]+$/.test(username)) {
      errors.push("Invalid Username. Only letters and numbers are allowed.");
  }

  // Validate email
  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("Invalid Email.");
  }

  if (firstName !== undefined && !/^[a-zA-Z]*$/.test(firstName)) {
      errors.push("Invalid Firstname.");
  }

  if (lastName !== undefined && !/^[a-zA-Z]*$/.test(lastName)) {
      errors.push("Invalid Lastname.");
  }

  // Validate format and length of Social Security Number for patients
  if (
      roles &&
      roles.toLowerCase() === "patient" &&
      (socialSecurityNumber === undefined || socialSecurityNumber.length !== 11 || /[^0-9]/.test(socialSecurityNumber))
  ) {
      errors.push("Invalid Social Security Number.");
  }

  // Validate specialty for doctors
  if (
      roles &&
      roles.toLowerCase() === "doctor" &&
      (specialty === undefined || !/^[a-zA-Z]*$/.test(specialty))
  ) {
      errors.push("Invalid Specialty.");
  }

  // Validate the ID number
  if (IDNumber !== undefined && !/^[a-zA-Z]{2}[0-9]{6}$/.test(IDNumber)) {
      errors.push("Invalid ID Number. It must start with two letters followed by six digits.");
  }

  if (errors.length > 0) {
      return res.status(400).json({ errors });
  }

  User.find({ username })
      .exec()
      .then((user) => {
          if (user.length >= 1) {
              return res.status(409).json({
                  message: "Username already exists",
              });
          } else {
              const allowedRoles = ["patient", "doctor", "secretary"];

              if (!roles || typeof roles !== "string" || !allowedRoles.includes(roles.toLowerCase())) {
                  return res.status(400).json({
                      message: 'Invalid role. Role must be "patient", "doctor", or "secretary"',
                  });
              }

              bcrypt.hash(password, 10, (err, hash) => {
                  if (err) {
                      return res.status(500).json({ error: err });
                  } else {
                      const newUser = new User({
                          _id: new mongoose.Types.ObjectId(),
                          username,
                          password: hash,
                          email,
                          IDNumber,
                          firstName,
                          lastName,
                          socialSecurityNumber: roles.toLowerCase() === "patient" ? socialSecurityNumber : undefined,
                          specialty: roles.toLowerCase() === "doctor" ? specialty : undefined,
                          roles: [roles.toLowerCase()],
                      });

                      newUser.save()
                          .then((result) => {
                              const userResponse = {
                                  id: result._id,
                                  username: result.username,
                                  email: result.email,
                                  IDNumber: result.IDNumber,
                                  firstName: result.firstName,
                                  lastName: result.lastName,
                                  socialSecurityNumber: result.socialSecurityNumber,
                                  specialty: result.specialty,
                                  roles: result.roles,
                              };

                              return res.status(201).json({
                                  message: "User created successfully",
                                  user: userResponse,
                              });
                          })
                          .catch((err) => {
                              console.log(err);
                              return res.status(500).json({ error: err });
                          });
                  }
              });
          }
      })
      .catch((err) => {
          console.log(err);
          return res.status(500).json({ error: err });
      });
});

// Login route for user authentication
router.post("/login", (req, res, next) => {
  User.findOne({ username: req.body.username })
    .exec()
    .then((user) => {
      if (!user) {
        console.log("User not found");
        return res.status(401).json({ message: "Invalid credentials" });
      }

      bcrypt.compare(req.body.password, user.password, (err, result) => {
        if (err) {
          console.log(err);
          return res.status(401).json({ message: "Invalid credentials" });
        }

        if (result) {
          console.log("Password matched");

          const token = jwt.sign(
            {
              username: user.username,
              _id: user._id,
              roles: user.roles || [], // Ensure user.roles is an array or set to an empty array
            },
            process.env.JWT_KEY,
            {
              expiresIn: "1h",
            }
          );

          return res.status(200).json({
            message: "Authentication successful",
            token: token,
          });
        } else {
          console.log("Password not matched");
          return res.status(401).json({ message: "Invalid credentials" });
        }
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: err });
    });
});

module.exports = router;
