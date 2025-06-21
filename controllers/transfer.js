const { v4: uuidv4 } = require('uuid');
const { Users } = require('../models/users');
const { MainBalance } = require('../models/balance');
const SpotBalance = require('../models/spot-balance');
const FuturesBalance = require('../models/futures-balance');
const { Transactions } = require('../models/transactions');
const TransferHistory = require('../models/transfer');
const { calculateTradingProfit, getTradingVolumeStatus: getVolumeStatus } = require('../utils/tradingVolume');

/**
 * Transfer funds from Exchange (main balance) to Trade (spot/futures balance)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function transferToTrade(req, res) {
    try {
        const user = req.user;
        const { amount, destination, coinId, coinName } = req.body;

        // Validate required fields
        if (!amount || !destination || !coinId || !coinName) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: amount, destination, coinId, coinName'
            });
        }

        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be greater than 0'
            });
        }

        // Validate destination
        if (!['spot', 'futures'].includes(destination)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid destination. Must be spot or futures'
            });
        }

        // Check Exchange (main) balance - convert coinId to number for MainBalance
        const exchangeBalance = await MainBalance.findOne({ user: user._id, coinId: parseInt(coinId) });
        if (!exchangeBalance || exchangeBalance.balance < amount) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance in Exchange account'
            });
        }

        // Calculate required trading volume (1% per trade, so 100x the amount)
        const requiredVolume = amount * 100;

        // Create transfer record
        const transfer = new TransferHistory({
            user: user._id,
            fromAccount: 'exchange',
            toAccount: destination,
            coinId,
            coinName,
            amount,
            netAmount: amount, // No fee when transferring to trade
            requiredVolume,
            status: 'completed',
            transferType: 'exchange_to_trade'
        });

        await transfer.save();

        // Deduct from Exchange balance
        await MainBalance.findByIdAndUpdate(exchangeBalance._id, {
            $inc: { balance: -amount },
            updatedAt: new Date()
        });

        // Add to Trade balance
        let tradeBalance;
        if (destination === 'spot') {
            tradeBalance = await SpotBalance.findOne({ user: user._id, coinId });
            if (tradeBalance) {
                await SpotBalance.findByIdAndUpdate(tradeBalance._id, {
                    $inc: { balance: amount },
                    updatedAt: new Date()
                });
            } else {
                // Create new spot balance
                const newSpotBalance = new SpotBalance({
                    user: user._id,
                    coinId,
                    coinName,
                    balance: amount,
                    currency: coinName,
                    chain: 'default', // You might want to make this configurable
                    memo: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                await newSpotBalance.save();
            }
        } else if (destination === 'futures') {
            tradeBalance = await FuturesBalance.findOne({ user: user._id, coinId });
            if (tradeBalance) {
                await FuturesBalance.findByIdAndUpdate(tradeBalance._id, {
                    $inc: { balance: amount },
                    updatedAt: new Date()
                });
            } else {
                // Create new futures balance
                const newFuturesBalance = new FuturesBalance({
                    user: user._id,
                    coinId,
                    coinName,
                    balance: amount,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                await newFuturesBalance.save();
            }
        }

        // Create transaction record
        const transaction = new Transactions({
            user: user._id,
            coinId,
            currency: coinName,
            amount,
            type: 'transfer_exchange_to_trade',
            status: 'completed',
            referenceId: transfer._id.toString()
        });

        await transaction.save();

        res.status(200).json({
            success: true,
            message: `Successfully transferred ${amount} ${coinName} to ${destination} account`,
            data: {
                transferId: transfer._id,
                amount,
                coinName,
                destination,
                requiredVolume,
                status: 'completed'
            }
        });

    } catch (error) {
        console.error('Error transferring to trade:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to transfer funds to trade account'
        });
    }
}

/**
 * Transfer funds from Trade (spot/futures balance) to Exchange (main balance)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function transferToExchange(req, res) {
    try {
        const user = req.user;
        const { amount, source, coinId, coinName } = req.body;

        // Validate required fields
        if (!amount || !source || !coinId || !coinName) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: amount, source, coinId, coinName'
            });
        }

        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be greater than 0'
            });
        }

        // Validate source
        if (!['spot', 'futures'].includes(source)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid source. Must be spot or futures'
            });
        }

        // Check Trade balance
        let tradeBalance;
        if (source === 'spot') {
            tradeBalance = await SpotBalance.findOne({ user: user._id, coinId });
        } else if (source === 'futures') {
            tradeBalance = await FuturesBalance.findOne({ user: user._id, coinId });
        }

        if (!tradeBalance || tradeBalance.balance < amount) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance in ${source} account`
            });
        }

        // Get all transfers to this trade account
        const transfers = await TransferHistory.find({
            user: user._id,
            toAccount: source,
            coinId,
            status: 'completed'
        }).sort({ createdAt: -1 });

        // Calculate total required volume and current volume
        let totalRequiredVolume = 0;
        let totalTransferred = 0;

        transfers.forEach(transfer => {
            totalRequiredVolume += transfer.requiredVolume;
            totalTransferred += transfer.amount;
        });

        // Get user's trading profit (this would come from completed trades)
        const tradingProfit = await calculateTradingProfit(user._id, coinId, source);

        // Check if volume requirement is met
        const volumeMet = tradingProfit >= totalRequiredVolume;
        let fee = 0;
        let feeType = '';

        if (volumeMet) {
            // 10% withdrawal fee if volume is met
            fee = amount * 0.10;
            feeType = 'withdrawal_fee';
        } else {
            // 20% penalty fee if volume is not met
            fee = amount * 0.20;
            feeType = 'penalty_fee';
        }

        const netAmount = amount - fee;

        // Create transfer record
        const transfer = new TransferHistory({
            user: user._id,
            fromAccount: source,
            toAccount: 'exchange',
            coinId,
            coinName,
            amount,
            fee,
            feeType,
            netAmount,
            requiredVolume: totalRequiredVolume,
            currentVolume: tradingProfit,
            volumeMet,
            status: 'completed',
            transferType: 'trade_to_exchange'
        });

        await transfer.save();

        // Deduct from Trade balance
        await (source === 'spot' ? SpotBalance : FuturesBalance).findByIdAndUpdate(tradeBalance._id, {
            $inc: { balance: -amount },
            updatedAt: new Date()
        });

        // Add to Exchange balance
        const exchangeBalance = await MainBalance.findOne({ user: user._id, coinId: parseInt(coinId) });
        if (exchangeBalance) {
            await MainBalance.findByIdAndUpdate(exchangeBalance._id, {
                $inc: { balance: netAmount },
                updatedAt: new Date()
            });
        } else {
            // Create new exchange balance
            const newExchangeBalance = new MainBalance({
                user: user._id,
                coinId: parseInt(coinId),
                coinName,
                balance: netAmount,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            await newExchangeBalance.save();
        }

        // Create transaction record
        const transaction = new Transactions({
            user: user._id,
            coinId,
            currency: coinName,
            amount: netAmount,
            fee,
            feeType,
            type: 'transfer_trade_to_exchange',
            status: 'completed',
            referenceId: transfer._id.toString()
        });

        await transaction.save();

        res.status(200).json({
            success: true,
            message: `Successfully transferred ${amount} ${coinName} from ${source} to Exchange`,
            data: {
                transferId: transfer._id,
                amount,
                netAmount,
                fee,
                feeType,
                volumeMet,
                requiredVolume: totalRequiredVolume,
                currentVolume: tradingProfit,
                status: 'completed'
            }
        });

    } catch (error) {
        console.error('Error transferring to exchange:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to transfer funds to exchange account'
        });
    }
}

/**
 * Get user's transfer history
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getTransferHistory(req, res) {
    try {
        const user = req.user;
        const transfers = await TransferHistory.find({ user: user._id })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: transfers
        });

    } catch (error) {
        console.error('Error getting transfer history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get transfer history'
        });
    }
}

/**
 * Get user's trading volume status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getTradingVolumeStatus(req, res) {
    try {
        const user = req.user;
        const { accountType, coinId } = req.query;

        if (!accountType || !coinId) {
            return res.status(400).json({
                success: false,
                message: 'accountType and coinId are required'
            });
        }

        const volumeStatus = await getVolumeStatus(user._id, coinId, accountType);

        res.status(200).json({
            success: true,
            data: volumeStatus
        });

    } catch (error) {
        console.error('Error getting trading volume status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get trading volume status'
        });
    }
}

module.exports = {
    transferToTrade,
    transferToExchange,
    getTransferHistory,
    getTradingVolumeStatus
}; 