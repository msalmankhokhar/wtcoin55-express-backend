const mongoose = require('mongoose');
const crypto = require('crypto');

const UsersSchema = new mongoose.Schema({
    emailOrPhone: { type: String, required: false, unique: true },
    password: { type: String, required: true },
    phonenumber: { type: String, required: false, unique: true },
    referBy: { type: String, default: false },
    refCode: {
        type: String,
        default: function() {
            return crypto.randomBytes(6).toString('hex').toUpperCase();
        },
        unique: true
    },
    emailVerified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    lastLogin: {type: Date, required: false},
});

const Users = mongoose.model('Users', UsersSchema);
module.exports = { Users };