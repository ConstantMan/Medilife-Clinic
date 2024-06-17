const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    username: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    IDNumber: {
        type: String,
        unique: true,
        required: true // Ensure ID number is required
    },
    socialSecurityNumber: {
        type: String,
        required: function() {
            // Require socialSecurityNumber if role is not "doctor" or "secretary"
            return !this.roles.includes("doctor") && !this.roles.includes("secretary");
        }
    },
    specialty: {
        type: String,
        required: function() {
            // Require specialty if role is "doctor"
            return this.roles.includes("doctor");
        }
    },
    roles: [{
        type: String,
        enum: ['patient', 'doctor', 'secretary'],
        required: true
    }]
});

module.exports = mongoose.model('User', userSchema);
