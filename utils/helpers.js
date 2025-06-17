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
    const { type, user, coinId, amount, currency, chain, memo } = transaction;
    const balanceModel = type === "deposit_to_spots" ? SpotBalance : FuturesBalance;
    if (!user) return "User not found";

    let balance = await balanceModel.findOne({ user, coinId });
    if (balance) {
        balance.balance += amount;
        await balance.save();
    } else {
        balance = new balanceModel({
            user,
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

/**
 * Get Spot Order Details and Try to Match Trades
 * @param {string} orderId - BitMart order ID
 * @returns {Promise<Object>} - Updated order data
 */
async function getSpotOrder(orderId) {
    try {
        // 1. Get order details
        const { code: orderCode, message: orderMessage, data: orderData } = await bitmart.getSpotOrder(orderId);
        
        if (orderCode !== 1000) {
            console.log("Order response error:", { code: orderCode, message: orderMessage });
            throw new Error(orderMessage || 'Unknown error fetching order');
        }

        // 2. Check if order needs trade analysis
        if (orderData.state !== 'filled' && orderData.state !== 'partially_filled') {
            return {
                orderId: orderData.orderId,
                state: orderData.state,
                filledSize: orderData.filledSize || '0',
                priceAvg: orderData.priceAvg || '0',
                needsUpdate: false
            };
        }

        // 3. Get account trades around the order execution time to find matching trades
        const orderCreateTime = orderData.createTime;
        const orderUpdateTime = orderData.updateTime;
        
        // Search for trades in a window around order execution
        const searchStartTime = orderCreateTime - 60000; // 1 minute before
        const searchEndTime = orderUpdateTime + 60000;   // 1 minute after
        
        const { code: tradesCode, message: tradesMessage, data: tradesData } = await bitmart.getSpotTrades(
            orderData.symbol,
            'spot',
            searchStartTime,
            searchEndTime,
            50 // Get more trades to find matches
        );

        let matchingTrades = [];
        let totalFees = 0;
        let feeType = 'taker'; // Default
        let feeCurrency = 'USDT';

        if (tradesCode === 1000 && Array.isArray(tradesData) && tradesData.length > 0) {
            // Filter trades that likely belong to this order
            matchingTrades = tradesData.filter(trade => {
                const tradeTime = trade.createTime;
                const tradeSide = trade.side;
                const tradePrice = parseFloat(trade.price);
                const orderPrice = parseFloat(orderData.priceAvg || orderData.price);
                
                // Match criteria:
                // 1. Trade time between order create and update time
                // 2. Same side (buy/sell)
                // 3. Price within reasonable range of order execution price
                const timeMatch = tradeTime >= orderCreateTime && tradeTime <= orderUpdateTime;
                const sideMatch = tradeSide === orderData.side;
                const priceMatch = Math.abs(tradePrice - orderPrice) < (orderPrice * 0.01); // Within 1%
                
                return timeMatch && sideMatch && priceMatch;
            });

            // Calculate fees from matching trades
            for (const trade of matchingTrades) {
                totalFees += parseFloat(trade.fee || 0);
                if (trade.tradeRole === 'maker') {
                    feeType = 'maker';
                }
                feeCurrency = trade.feeCoinName || feeCurrency;
            }
        }

        // 4. Fallback fee estimation if no matching trades found
        if (matchingTrades.length === 0 && orderData.state === 'filled') {
            console.warn(`No matching trades found for order ${orderId}, using fallback estimation`);
            
            // Estimate fees based on order type and timing
            const executionSpeed = orderUpdateTime - orderCreateTime;
            
            // If order executed very quickly (< 1 second), likely a taker
            if (orderData.type === 'market' || executionSpeed < 1000) {
                feeType = 'taker';
            } else {
                feeType = 'maker';
            }
            
            // Estimate fee (you'll need to get actual fee rates)
            const executedValue = parseFloat(orderData.filledNotional || 0);
            const estimatedFeeRate = feeType === 'maker' ? 0.001 : 0.0025; // Example rates
            totalFees = executedValue * estimatedFeeRate;
        }

        // 5. Return complete order data
        return {
            orderId: orderData.orderId,
            symbol: orderData.symbol,
            state: orderData.state,
            side: orderData.side,
            type: orderData.type,
            originalPrice: orderData.price,
            executionPrice: orderData.priceAvg,
            originalSize: orderData.size,
            filledSize: orderData.filledSize,
            filledNotional: orderData.filledNotional,
            feeType: feeType,
            exchangeFees: totalFees,
            feeCurrency: feeCurrency,
            createTime: orderData.createTime,
            updateTime: orderData.updateTime,
            matchingTrades: matchingTrades,
            isEstimated: matchingTrades.length === 0,
            needsUpdate: true
        };

    } catch (error) {
        console.error(`Error processing order ${orderId}:`, error);
        return {
            orderId: orderId,
            error: error.message,
            needsUpdate: false
        };
    }
}


module.exports = { createOrUpdateOTP, createOrUpdateResetOTP, generateReferralCdoe, validateVerificationCode,
    updateTradingWallet, getSpotOrder
 };