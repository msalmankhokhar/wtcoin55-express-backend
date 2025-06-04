let mongoose = require('mongoose');

let resetOtpSchema = new mongoose.Schema({
     email: {
        type: String,
        required: true
     },
     otp: {
          type: String,
          required: true
     },
     createdAt: {
          type: Date,
          default: Date.now
     },
     expiredAt: {
          type: Date,
          default: () => new Date(Date.now() + 5 * 60 * 1000)
   },
     
});

const Reset_OTP = mongoose.model('Reset_OTP', resetOtpSchema);
module.exports = { Reset_OTP };

