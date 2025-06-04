const crypto = require('crypto');
const { Users } = require('../models/users');
const { OTP } = require('../models/otp');

/**
 * Generates a numeric OTP of a given length
 * @param {number} length 
 * @returns {string}
 */
function generateNumericOTP(length = 6) {
    return Array.from(crypto.randomBytes(length))
        .map(byte => (byte % 10).toString()) // Fix typo from toxString to toString
        .join('');
}

/**
 * Creates or replaces OTP for a given email
 * @param {string} email 
 * @returns {Promise<string>} the newly generated OTP
 */
async function createOrUpdateOTP(email, phonenumber) {
    // Delete any existing OTP for the email
    if (email) await OTP.findOneAndDelete({ email });
    else if (phonenumber) await OTP.findOneAndDelete({ phonenumber });

    // Generate a new OTP
    const otpCode = generateNumericOTP();

    // Create and save the new OTP
    const newOtp = new OTP({ email, otp: otpCode });
    await newOtp.save();

    return otpCode;
}


// Generate referal code
async function generateReferralCdoe(length = 6) {
    const refCode = crypto.randomBytes(6).toString('hex').toUpperCase();

    const checkIfExist = await Users.findOne({ refCode: refCode });
    if (checkIfExist) return generateReferralCdoe(length);

    return refCode;
}

module.exports = { createOrUpdateOTP, createOrUpdateResetOTP, generateReferralCdoe };