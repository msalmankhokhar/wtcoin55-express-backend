const crypto = require('crypto');
const { Users } = require('../models/users');
const { OTP } = require('../models/otp');
const { Reset_OTP } = require('../models/reset-otp');
const { SpotBalance } = require('../models/spot-balance');
const { FuturesBalance } = require('../models/futures-balance');
const { Transactions } = require('../models/transactions');
const BitMart = require('../utils/bitmart');
const bitmart = new BitMart(
    process.env.BITMART_API_KEY,
    process.env.BITMART_API_SECRET,
    process.env.BITMART_API_MEMO,
    process.env.BITMART_BASE_URL
);

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

    if (existingUser) return [false, "User already exists"];

    // Get the verification status
    // console.log(lowerCaseEmailOrPhone, code);
    verificationStatus = await OTP.findOne({ emailOrPhone: lowerCaseEmailOrPhone, otp: code });
    // console.log(verificationStatus);

    if (!verificationStatus || verificationStatus.status !== 'pending') {
        // return res.status(400).json({ message: 'Invalid verification code' });
        // console.log("Invalid verification code");
        return [false, "Invalid verification code"];
    } 
    else if (verificationStatus.expiredAt < Date.now()) {
        // return ({ message: 'Verification code has expired' });
        return [false, "Verification code has expired"];
    }
    else if (verificationStatus && verificationStatus.status === 'pending') {
        // console.log("I got here");
        verificationStatus.status = 'verified';
        verificationStatus.expiredAt = new Date();
        await verificationStatus.save();
        return [true, "Verification successful"];
    }

    // Update the verification status
    return [false, "Verification failed"];
}

/**
 * Updates the trading wallet balance based on the provided transaction.
 *
 * @param {Object} transaction - The transaction object containing type, userId, coinId, amount, currency, chain, and memo.
 * @return {Promise<void>} - Resolves when the trading wallet balance has been updated.
 */
async function updateTradingWallet(transaction) {
    const { type, userId, coinId, amount, currency, chain, memo } = transaction;
    const balanceModel = type === "deposit_to_spots" ? SpotBalance : FuturesBalance;

    let balance = await balanceModel.findOne({ user: userId, coinId });
    if (balance) {
        balance.balance += amount;
        await balance.save();
    } else {
        balance = new balanceModel({
            user: userId,
            coinId,
            balance: amount,
            currency,
            chain,
            memo: memo || "",
            updatedAt: new Date(),
        });
        await balance.save();
    }

    if (type === "deposit_to_futures") {
        await bitmart.SpotToFuturesTransfer(currency, amount);
    }

    // Update the transaction status
    await Transactions.updateOne(
        { _id: transaction._id },
        { $set: { status: 'completed', webhookStatus: 'completed', updatedAt: Date.now() } }
    );
}

async function getSpotOrder(orderId) {
    const response = await bitmart.getSpotOrder(orderId);

    const { code, message, data } = response;
    if (code !== 1000) {
        console.log("Response:", response);
        throw new Error(response.error || message || 'Unknown error');
    }
    return data;
}

module.exports = { createOrUpdateOTP, createOrUpdateResetOTP, generateReferralCdoe, validateVerificationCode,
    updateTradingWallet
 };