const { Users } = require('../models/users');
const { MainBalance } = require('../models/balance');
const { Transactions } = require('../models/transactions');
const cloudinary = require('cloudinary').v2;

const getProfile = async (req, res) => {
    console.log(req.user);
    let user = await Users.findOne({ _id: req.user._id }, { password: 0 })
        .populate('vipTier', '_id vipName vipLevel');
    const referrals = await Users.find({ referBy: req.user.refCode }, { _id: 1, email: 1, createdAt: 1 });
    const referralCount = referrals.length;
    
    // Convert to plain object
    const userObj = user.toObject();
    userObj.referrals = referrals;
    userObj.referralCount = referralCount;

    return res.status(200).json(userObj);
};


const getBalance = async (req, res) => {
    try {
        const balance = await MainBalance.find({ user: req.user._id });

        if (balance.length === 0) {
            const usdtBalance = await MainBalance({
                user: req.user._id,
                coinId: 1280,
                coinName: 'USDT',
                balance: 0
            });
            await usdtBalance.save();

            return res.status(200).json({msg: "success", balance: [usdtBalance]});
        }

        return res.status(200).json({msg: "success", balance});
    } catch (error) {
        console.error('Error retrieving balance:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


const transactionHistory = async (req, res) => {
    try {
        const transactions = await Transactions.find({ user: req.user._id }).sort({ createdAt: -1 });

        return res.status(200).json({msg: "success", transactions});
    } catch (error) {
        console.log("Error fetching transactions: ", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

const depositTransactionHistory = async (req, res) => {
    try {
        const transactions = await Transactions.find({ user: req.user._id, type: "deposit" }).sort({ createdAt: -1 });

        return res.status(200).json({msg: "success", transactions});
    } catch (error) {
        console.log("Error fetching transactions: ", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

const withdrawTransactionHistory = async (req, res) => {
    try {
        const { WithdrawalRequest } = require('../models/withdrawal');

        const user = req.user;
        const requests = await WithdrawalRequest.find({ user: user._id })
            .sort({ createdAt: -1 });

        return res.status(200).json({msg: "success", transactions: requests});

    } catch (error) {
        console.error('Error getting user withdrawal requests:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * Get user's balances across all accounts
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUserBalances(req, res) {
    try {
        const user = req.user;

        // Get Exchange (main) balances
        const { MainBalance } = require('../models/balance');
        const exchangeBalances = await MainBalance.find({ user: user._id });

        // Get Spot balances
        const SpotBalance = require('../models/spot-balance');
        const spotBalances = await SpotBalance.find({ user: user._id });

        // Get Futures balances
        const FuturesBalance = require('../models/futures-balance');
        const futuresBalances = await FuturesBalance.find({ user: user._id });

        res.status(200).json({
            success: true,
            data: {
                exchange: exchangeBalances,
                spot: spotBalances,
                futures: futuresBalances
            }
        });

    } catch (error) {
        console.error('Error getting user balances:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user balances'
        });
    }
}

/**
 * Get user's trading volume status for all coins
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUserTradingVolumeStatus(req, res) {
    try {
        const user = req.user;
        const { getTradingVolumeStatus } = require('../utils/tradingVolume');

        // Get all spot balances
        const SpotBalance = require('../models/spot-balance');
        const spotBalances = await SpotBalance.find({ user: user._id });

        // Get all futures balances
        const FuturesBalance = require('../models/futures-balance');
        const futuresBalances = await FuturesBalance.find({ user: user._id });

        console.log(spotBalances);
        console.log(futuresBalances);

        // Calculate volume status for each balance
        const spotVolumeStatus = await Promise.all(
            spotBalances
                .filter(balance => balance.coinId === "1280") // Only include USDT
                .map(async (balance) => {
                    return await getTradingVolumeStatus(user._id, (balance.coinId).toString(), 'spot', balance.balance, balance.requiredVolume);
                })
        );

        const futuresVolumeStatus = await Promise.all(
            futuresBalances
                .filter(balance => balance.coinId === "1280") // Only include USDT
                .map(async (balance) => {
                    return await getTradingVolumeStatus(user._id, balance.coinId, 'futures', balance.requiredVolume);
                })
        );

        res.status(200).json({
            success: true,
            data: {
                spot: spotVolumeStatus,
                futures: futuresVolumeStatus
            }
        });

    } catch (error) {
        console.error('Error getting user trading volume status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user trading volume status'
        });
    }
}

async function kycVerificationSubmission(req, res) {
    try {
        const user = req.user;
        const { kycVerification } = require('../models/kycVerification');

        console.log(req.body);
        const { fullName, city, country, idNumber } = req.body;
        const { frontImage, backImage, idImage } = req.files;

        // Validate required fields
        if (!fullName || !city || !country || !idNumber || !frontImage || !backImage || !idImage) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required: fullName, city, country, idNumber'
            });
        }

        console.log(user.kycVerification);
        if (user.kycVerification) {
            return res.status(400).json({
                success: false,
                message: 'KYC verification already submitted'
            });
        }

        const kycVerificationExist = await kycVerification.findOne({ user: user._id, status: 'pending' });
        if (kycVerificationExist) {
            return res.status(400).json({
                success: false,
                message: 'KYC verification already submitted'
            });
        }

        // Handle image upload with cloudinary
        const frontImageResult = await cloudinary.uploader.upload(frontImage.tempFilePath);
        const frontImageUrl = frontImageResult.secure_url;

        const backImageResult = await cloudinary.uploader.upload(backImage.tempFilePath);
        const backImageUrl = backImageResult.secure_url;

        const idImageResult = await cloudinary.uploader.upload(idImage.tempFilePath);
        const idImageUrl = idImageResult.secure_url;

        console.log(frontImageUrl);
        console.log(backImageUrl);
        console.log(idImageUrl);

        const kycverification = new kycVerification({
            user: user._id,
            fullName,
            city,
            country,
            idNumber,
            frontImageUrl,
            backImageUrl,
            idImageUrl
        });

        await kycverification.save();

        res.status(200).json({
            success: true,
            message: 'KYC verification submitted successfully'
        });
    } catch (error) {
        console.error('Error submitting KYC verification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit KYC verification'
        });
    }
}

module.exports = { getProfile, getBalance, transactionHistory, depositTransactionHistory, withdrawTransactionHistory, getUserBalances, getUserTradingVolumeStatus, kycVerificationSubmission };
