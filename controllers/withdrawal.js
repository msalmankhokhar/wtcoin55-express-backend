const { v4: uuidv4 } = require('uuid');
const { Users } = require('../models/users');
const { WithdrawalRequest } = require('../models/withdrawal');
const { MainBalance } = require('../models/balance');
// const { Transactions } = require('../models/transactions');
// const ccpayment = require('../utils/ccpayment');

/**
 * Submit withdrawal request (user endpoint)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function submitWithdrawalRequest(req, res) {
    try {
        const user = req.user;
        const { coinId, coinName, amount, address, chain, memo = '', walletType = 'main' } = req.body;

        // Validate required fields
        if (!coinId || !coinName || !amount || !address || !chain) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: coinId, coinName, amount, address, chain'
            });
        }

        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be greater than 0'
            });
        }

        // Validate wallet type
        if (!['main', 'spot', 'futures'].includes(walletType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid wallet type. Must be main, spot, or futures'
            });
        }

        // Check user balance based on wallet type
        let userBalance;
        if (walletType === 'main') {
            userBalance = await MainBalance.findOne({ user: user._id, coinId });
        }

        const withdrawalRequestExists = await WithdrawalRequest.find({ user: user._id, coinId, status: 'pending' });

        if (withdrawalRequestExists.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Withdrawal request already exists'
            });
        }

        if (!userBalance || userBalance.balance < amount) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance in ${walletType} wallet`
            });
        }

        // Create withdrawal request
        const withdrawalRequest = new WithdrawalRequest({
            user: user._id,
            coinId,
            coinName,
            amount,
            address,
            chain,
            memo,
            walletType,
            type: 'withdrawal',
            status: 'pending'
        });

        await withdrawalRequest.save();

        res.status(200).json({
            success: true,
            message: 'Withdrawal request submitted successfully. Awaiting admin approval.',
            data: {
                requestId: withdrawalRequest._id,
                amount,
                coinName,
                address,
                chain,
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('Error submitting withdrawal request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit withdrawal request'
        });
    }
}

/**
 * Get user's withdrawal requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUserWithdrawalRequests(req, res) {
    try {
        const user = req.user;
        const requests = await WithdrawalRequest.find({ user: user._id })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: requests
        });

    } catch (error) {
        console.error('Error getting user withdrawal requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get withdrawal requests'
        });
    }
}

module.exports = {
    submitWithdrawalRequest,
    getUserWithdrawalRequests
}; 