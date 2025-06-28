const { v4: uuidv4 } = require('uuid');
const { Users } = require('../models/users');
const { MainBalance } = require('../models/balance');
const SpotBalance = require('../models/spot-balance');
const FuturesBalance = require('../models/futures-balance');
const { Transactions } = require('../models/transactions');
const TransferHistory = require('../models/transfer');
const { safeCreateBalance } = require('../utils/helpers');
const { getOrCreateTradingVolume, setRequiredVolume, getTradingVolumeStatus: getTradingVolumeStatusUtil } = require('../utils/tradingVolume');
const TradingVolume = require('../models/tradingVolume');

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

        // Calculate required trading volume (2x the amount) - only for USDT (coinId: 1280)
        const requiredVolume = coinId === '1280' ? amount * 2 : 0;

        // Get or create trading volume record - only for USDT
        let tradingVolume = null;
        if (coinId === '1280') {
            tradingVolume = await getOrCreateTradingVolume(user._id, coinId, coinName);
            
            // Set the required volume for this transfer
            await setRequiredVolume(user._id, coinId, requiredVolume);
        }

        // Create transfer record
        const transfer = new TransferHistory({
            user: user._id,
            fromAccount: 'exchange',
            toAccount: destination,
            coinId,
            coinName,
            amount,
            fee: 0, // No fee when transferring to trade
            feeType: 'no_fee', // No fee when transferring to trade
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

        // Add to Trade balance and link to trading volume
        let tradeBalance;
        if (destination === 'spot') {
            tradeBalance = await SpotBalance.findOne({ user: user._id, coinId });
            if (tradeBalance) {
                const updateData = {
                    $inc: { balance: amount },
                    updatedAt: new Date()
                };
                
                // Only link to trading volume for USDT
                if (tradingVolume) {
                    updateData.tradingVolumeId = tradingVolume._id;
                }
                
                await SpotBalance.findByIdAndUpdate(tradeBalance._id, updateData);
            } else {
                // Create new spot balance
                const newSpotBalance = new SpotBalance({
                    user: user._id,
                    coinId,
                    coinName,
                    balance: amount,
                    tradingVolumeId: tradingVolume ? tradingVolume._id : undefined, // Only link for USDT
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
                const updateData = {
                    $inc: { balance: amount },
                    updatedAt: new Date()
                };
                
                // Only link to trading volume for USDT
                if (tradingVolume) {
                    updateData.tradingVolumeId = tradingVolume._id;
                }
                
                await FuturesBalance.findByIdAndUpdate(tradeBalance._id, updateData);
            } else {
                // Create new futures balance
                const newFuturesBalanceData = {
                    user: user._id,
                    coinId,
                    coinName,
                    balance: amount,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                
                // Only link to trading volume for USDT
                if (tradingVolume) {
                    newFuturesBalanceData.tradingVolumeId = tradingVolume._id;
                }
                
                const newFuturesBalance = new FuturesBalance(newFuturesBalanceData);
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
            tradeBalance = await SpotBalance.find({ user: user._id });
        } else if (source === 'futures') {
            tradeBalance = await FuturesBalance.find({ user: user._id });
        }

        console.log(tradeBalance);
        let newTradeBalance = tradeBalance.find(balance => balance.coinId === coinId);
        console.log(newTradeBalance);

        if (!newTradeBalance || newTradeBalance.balance < amount) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance in ${source} account`
            });
        }

        // Get current trading volume from balance model (much more efficient!)
        let tradingVolume = await TradingVolume.findOne({ user: user._id, coinId });

        const currentVolume = tradingVolume.totalTradingVolume || 0;
        const requiredVolume = tradingVolume.requiredVolume || 0;

        console.log(`📊 [transferToExchange] Current volume: ${currentVolume}, Required volume: ${requiredVolume}`);

        // Check if volume requirement is met
        const volumeMet = currentVolume >= requiredVolume;
        console.log(`📊 [transferToExchange] Volume met: ${volumeMet}`);
        
        let fee = 0;
        let feeType = 'no_fee'; // Default to no_fee instead of empty string

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
        const newBalance = newTradeBalance.balance - amount;
        const newRequiredVolume = newBalance * 2; // 2x the remaining balance

        // Deduct from Trade balance and update required volume
        await (source === 'spot' ? SpotBalance : FuturesBalance).findByIdAndUpdate(newTradeBalance._id, {
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
            // Use safeCreateBalance to handle race conditions
            await safeCreateBalance(MainBalance, {
                user: user._id,
                coinId: parseInt(coinId),
                coinName,
                balance: netAmount,
                createdAt: new Date(),
                updatedAt: new Date()
            });
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
 * Transfer funds between Trade accounts (spot to futures or futures to spot)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function transferBetweenTradeAccounts(req, res) {
    try {
        const user = req.user;
        const { amount, fromAccount, toAccount, coinId, coinName } = req.body;

        // Validate required fields
        if (!amount || !fromAccount || !toAccount || !coinId || !coinName) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: amount, fromAccount, toAccount, coinId, coinName'
            });
        }

        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be greater than 0'
            });
        }

        // Validate accounts
        if (!['spot', 'futures'].includes(fromAccount) || !['spot', 'futures'].includes(toAccount)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid account type. Must be spot or futures'
            });
        }

        // Prevent transferring to the same account
        if (fromAccount === toAccount) {
            return res.status(400).json({
                success: false,
                message: 'Cannot transfer to the same account type'
            });
        }

        // Check source account balance
        let sourceBalance;
        if (fromAccount === 'spot') {
            sourceBalance = await SpotBalance.findOne({ user: user._id, coinId });
        } else {
            sourceBalance = await FuturesBalance.findOne({ user: user._id, coinId });
        }

        if (!sourceBalance || sourceBalance.balance < amount) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance in ${fromAccount} account`
            });
        }

        // Trade-to-trade transfers are completely fee-free
        const fee = 0;
        const feeType = 'no_fee';
        const netAmount = amount; // No fee deduction

        // Create transfer record
        const transfer = new TransferHistory({
            user: user._id,
            fromAccount,
            toAccount,
            coinId,
            coinName,
            amount,
            fee,
            feeType,
            netAmount,
            requiredVolume: 0, // No volume requirements for trade-to-trade
            currentVolume: 0,
            volumeMet: true, // Always true since no volume requirements
            status: 'completed',
            transferType: 'trade_to_trade'
        });

        await transfer.save();

        // Deduct from source account
        const newSourceBalance = sourceBalance.balance - amount;

        await (fromAccount === 'spot' ? SpotBalance : FuturesBalance).findByIdAndUpdate(sourceBalance._id, {
            balance: newSourceBalance,
            updatedAt: new Date()
        });

        // Add to destination account
        let destBalance;
        if (toAccount === 'spot') {
            destBalance = await SpotBalance.findOne({ user: user._id, coinId });
            if (destBalance) {
                await SpotBalance.findByIdAndUpdate(destBalance._id, {
                    $inc: { balance: netAmount },
                    updatedAt: new Date()
                });
            } else {
                // Create new spot balance
                const newSpotBalance = new SpotBalance({
                    user: user._id,
                    coinId,
                    coinName,
                    balance: netAmount,
                    currency: coinName,
                    chain: 'default',
                    memo: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                await newSpotBalance.save();
            }
        } else {
            destBalance = await FuturesBalance.findOne({ user: user._id, coinId });
            if (destBalance) {
                await FuturesBalance.findByIdAndUpdate(destBalance._id, {
                    $inc: { balance: netAmount },
                    updatedAt: new Date()
                });
            } else {
                // Create new futures balance
                const newFuturesBalance = new FuturesBalance({
                    user: user._id,
                    coinId,
                    coinName,
                    balance: netAmount,
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
            amount: netAmount,
            fee,
            feeType,
            type: 'transfer_trade_to_trade',
            status: 'completed',
            referenceId: transfer._id.toString()
        });

        await transaction.save();

        res.status(200).json({
            success: true,
            message: `Successfully transferred ${netAmount} ${coinName} from ${fromAccount} to ${toAccount}`,
            data: {
                transferId: transfer._id,
                amount,
                netAmount,
                fee,
                feeType,
                volumeMet: true,
                requiredVolume: 0,
                currentVolume: 0,
                status: 'completed'
            }
        });

    } catch (error) {
        console.error('Error transferring between trade accounts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to transfer funds between trade accounts'
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

        // Validate account type
        if (!['spot', 'futures'].includes(accountType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid accountType. Must be spot or futures'
            });
        }

        // Check if balance exists for this account type
        let balance;
        if (accountType === 'spot') {
            balance = await SpotBalance.findOne({ user: user._id, coinId });
        } else if (accountType === 'futures') {
            balance = await FuturesBalance.findOne({ user: user._id, coinId });
        }

        if (!balance) {
            return res.status(404).json({
                success: false,
                message: `No ${accountType} balance found for this coin`
            });
        }

        // Get trading volume status from unified TradingVolume model
        const volumeStatus = await getTradingVolumeStatusUtil(user._id, coinId);

        const responseData = {
            totalRequiredVolume: volumeStatus.requiredVolume,
            currentVolume: volumeStatus.totalTradingVolume,
            volumeMet: volumeStatus.volumeMet,
            remainingVolume: volumeStatus.remainingVolume,
            withdrawalFee: 0.00, // 0% if volume met (as per your changes)
            penaltyFee: 0.20     // 20% if volume not met
        };

        res.status(200).json({
            success: true,
            data: responseData
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
    transferBetweenTradeAccounts,
    getTransferHistory,
    getTradingVolumeStatus
}; 