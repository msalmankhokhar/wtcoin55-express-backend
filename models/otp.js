let mongoose = require('mongoose');

let otpSchema = new mongoose.Schema({
     emailOrPhone: {
        type: String,
        required: true
     },
     otp: {
          type: String,
          required: true
     },
     status: {
        type: String,
        default: 'pending',
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

const OTP = mongoose.model('OTP', otpSchema);
module.exports = { OTP }; 
