const { v4: uuidv4 } = require('uuid');
const { Users } = require('../models/users');
const { MainBalance } = require('../models/balance');
const SpotBalance = require('../models/spot-balance');
const FuturesBalance = require('../models/futures-balance');
const { Transactions } = require('../models/transactions');
const TransferHistory = require('../models/transfer');

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
        const requiredVolume = amount * 2;

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

        // Add to Trade balance and RESET trading volume to 0
        let tradeBalance;
        if (destination === 'spot') {
            tradeBalance = await SpotBalance.findOne({ user: user._id, coinId });
            if (tradeBalance) {
                await SpotBalance.findByIdAndUpdate(tradeBalance._id, {
                    $inc: { balance: amount },
                    tradingVolume: 0, // Reset trading volume when new funds are added
                    requiredVolume: requiredVolume, // Set required volume
                    updatedAt: new Date()
                });
            } else {
                // Create new spot balance
                const newSpotBalance = new SpotBalance({
                    user: user._id,
                    coinId,
                    coinName,
                    balance: amount,
                    tradingVolume: 0, // Start with 0 trading volume
                    requiredVolume: requiredVolume, // Set required volume
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
                    tradingVolume: 0, // Reset trading volume when new funds are added
                    requiredVolume: requiredVolume, // Set required volume
                    updatedAt: new Date()
                });
            } else {
                // Create new futures balance
                const newFuturesBalance = new FuturesBalance({
                    user: user._id,
                    coinId,
                    coinName,
                    balance: amount,
                    tradingVolume: 0, // Start with 0 trading volume
                    requiredVolume: requiredVolume, // Set required volume
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
        const validCoins = ['1280'];
        if (!validCoins.includes(coinId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid coinId. Must be 1280'
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
        console.log(req.body);
        let tradeBalance;
        if (source === 'spot') {
            tradeBalance = await SpotBalance.findOne({ user: user._id });
        } else if (source === 'futures') {
            tradeBalance = await FuturesBalance.findOne({ user: user._id });
        }

        console.log(tradeBalance);
        let newTradeBalance = tradeBalance.find(balance => balance.coinId === coinId);
        console.log(newTradeBalance);

        if (!tradeBalance || tradeBalance.balance < amount) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance in ${source} account`
            });
        }

        // Get current trading volume from balance model (much more efficient!)
        const currentVolume = tradeBalance.balance || 0;
        const requiredVolume = tradeBalance.requiredVolume || 0;

        console.log(`📊 [transferToExchange] Current volume: ${currentVolume}, Required volume: ${requiredVolume}`);

        // Check if volume requirement is met
        const volumeMet = currentVolume >= requiredVolume;
        console.log(`📊 [transferToExchange] Volume met: ${volumeMet}`);
        
        let fee = 0;
        let feeType = '';

        if (volumeMet) {
            // 0% withdrawal fee if volume is met (as per your changes)
            fee = 0;
            feeType = 'no_fee';
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
            requiredVolume: requiredVolume,
            currentVolume: currentVolume,
            volumeMet,
            status: 'completed',
            transferType: 'trade_to_exchange'
        });

        await transfer.save();

        // Calculate new balance after withdrawal
        const newBalance = tradeBalance.balance - amount;
        const newRequiredVolume = newBalance * 2; // 2x the remaining balance

        // Deduct from Trade balance and update required volume
        await (source === 'spot' ? SpotBalance : FuturesBalance).findByIdAndUpdate(tradeBalance._id, {
            balance: newBalance,
            requiredVolume: newRequiredVolume,
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
            message: `Successfully transferred ${netAmount} ${coinName} from ${source} to Exchange`,
            data: {
                transferId: transfer._id,
                amount,
                netAmount,
                fee,
                feeType,
                volumeMet,
                requiredVolume: newRequiredVolume,
                currentVolume: currentVolume,
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

        // Get balance and current trading volume directly from balance model
        let balance;
        if (accountType === 'spot') {
            balance = await SpotBalance.findOne({ user: user._id, coinId });
        } else if (accountType === 'futures') {
            balance = await FuturesBalance.findOne({ user: user._id, coinId });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid accountType. Must be spot or futures'
            });
        }

        if (!balance) {
            return res.status(404).json({
                success: false,
                message: `No ${accountType} balance found for this coin`
            });
        }

        const currentVolume = balance.tradingVolume || 0;
        const requiredVolume = balance.requiredVolume || 0;

        const volumeMet = currentVolume >= requiredVolume;
        const remainingVolume = Math.max(0, requiredVolume - currentVolume);

        const volumeStatus = {
            totalRequiredVolume: requiredVolume,
            currentVolume,
            volumeMet,
            remainingVolume,
            withdrawalFee: 0.00, // 0% if volume met (as per your changes)
            penaltyFee: 0.20     // 20% if volume not met
        };

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