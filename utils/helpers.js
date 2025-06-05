const crypto = require('crypto');
const { Users } = require('../models/users');
const { OTP } = require('../models/otp');
const { Reset_OTP } = require('../models/reset-otp');

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
 * @param {string} emailOrPhonenumber 
 * @returns {Promise<string>} the newly generated OTP
 */
async function createOrUpdateOTP(emailOrPhonenumber) {
    // Delete any existing OTP for the email
    const otpExists = await OTP.findOneAndDelete({
        $or: [
            { email: emailOrPhonenumber },
            { phonenumber: emailOrPhonenumber }
        ]
        });


    if (otpExists) {
        console.log(`Deleted existing OTP for ${emailOrPhonenumber}`);
    }

    // Generate a new OTP
    const otpCode = generateNumericOTP();

    // Create and save the new OTP
    const newOtp = new OTP({ emailOrPhone: emailOrPhonenumber, otp: otpCode });
    await newOtp.save();

    return otpCode;
}


/**
 * Creates or replaces OTP for a given email
 * @param {string} emailOrPhonenumber 
 * @returns {Promise<string>} the newly generated OTP
 */
async function createOrUpdateResetOTP(emailOrPhonenumber) {
    // Delete any existing OTP for the email
    let otpExists;
    
    otpExists = await Reset_OTP.findOneAndDelete({ $or: [{email: emailOrPhonenumber}, {phonenumber: emailOrPhonenumber}] });

    if (otpExists) {
        console.log(`Deleted existing OTP for ${emailOrPhonenumber}`);
    }

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

/**
 * Validate verification code
 * @param {string} emailOrPhonenumber 
 * @param {string} code 
 * @returns {Promise<bool>, Promise<string>} the message
 */
async function validateVerificationCode(emailOrPhonenumber, code) {
    let lowerCaseEmailOrPhone = emailOrPhonenumber.toLowerCase().trim();
    existingUser = await Users.findOne({ $or: [{email: lowerCaseEmailOrPhone}, {phonenumber: lowerCaseEmailOrPhone}] });
    
    if (existingUser) return false, "User already exists"

    // Get the verification status
    verificationStatus = OTP.find( {emailOrPhone: lowerCaseEmailOrPhone, otp: code} )[0];

    if (!verificationStatus || verificationStatus.status !== 'pending') {
        // return res.status(400).json({ message: 'Invalid verification code' });
        return false, "Invalid verification code";
    } 
    else if (verificationStatus.expiredAt < Date.now()) {
        // return ({ message: 'Verification code has expired' });
        return false, "Verification code has expired";
    }
    else if (verificationStatus && verificationStatus.status === 'pending') {
        verificationStatus.status = 'approved';
        await verificationStatus.save();
    }

    // Update the verification status
    verificationStatus.status = 'verified';
    verificationStatus.expiredAt = new Date();
    await verificationStatus.save();
    return true, "Verification successful";
}

module.exports = { createOrUpdateOTP, createOrUpdateResetOTP, generateReferralCdoe, validateVerificationCode };