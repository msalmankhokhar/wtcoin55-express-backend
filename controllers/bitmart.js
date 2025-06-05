const { Transactions } = require('../models/transactions');
const { MainBalance } = require('../models/balance');
const { SpotBalance } = require('../models/spot-balance');
const { FuturesBalance } = require('../models/futures-balance');
const { Users } = require('../models/users');
const BitMart = require('../utils/bitmart');
const mongoose = require('mongoose');

// Initialize BitMart client
const bitmart = new BitMart(
    process.env.BITMART_ACCESS_KEY,
    process.env.BITMART_SECRET_KEY,
    process.env.BITMART_MEMO,
    process.env.BITMART_BASE_URL
);

/**
 * Deposit Controller
 * Handles cryptocurrency deposit operations
 */
class DepositController {
    
    /**
     * Initiate deposit process - Generate deposit address and reference
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {Promise<Object>} - Deposit information with address and reference
     */
    static async initiateDeposit(req, res) {
        try {
            const { userId, currency, expectedAmount } = req.body;
            
            // Validate input
            if (!userId || !currency || !expectedAmount) {
                return res.status(400).json({
                    success: false,
                    message: 'userId, currency, and expectedAmount are required'
                });
            }
            
            // Check if user exists
            const user = await Users.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            // Check if deposits are enabled for this currency
            const isDepositEnabled = await bitmart.isDepositEnabled(currency);
            if (!isDepositEnabled) {
                return res.status(400).json({
                    success: false,
                    message: `Deposits are currently disabled for ${currency}`
                });
            }
            
            // Get deposit address from BitMart
            const depositAddressResponse = await bitmart.getDepositAddress(currency);
            if (!depositAddressResponse.data) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to get deposit address from BitMart'
                });
            }
            
            // Generate unique reference
            const reference = bitmart.generateDepositReference(userId, currency);
            
            // Create transaction record
            const transaction = new Transactions({
                userId: userId,
                reference: reference,
                type: 'deposit',
                status: 'pending',
                amount: expectedAmount,
                currency: currency.toUpperCase(),
                netAmount: expectedAmount,
                address: depositAddressResponse.data.address,
                addressMemo: depositAddressResponse.data.address_memo || '',
                notes: `Deposit initiated for ${currency}`
            });
            
            await transaction.save();
            
            res.status(200).json({
                success: true,
                message: 'Deposit initiated successfully',
                data: {
                    reference: reference,
                    address: depositAddressResponse.data.address,
                    addressMemo: depositAddressResponse.data.address_memo || '',
                    currency: currency.toUpperCase(),
                    expectedAmount: expectedAmount,
                    instructions: `Send exactly ${expectedAmount} ${currency.toUpperCase()} to the address above with reference: ${reference}`
                }
            });
            
        } catch (error) {
            console.error('Deposit initiation error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    
    /**
     * Check deposit status and update if completed
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {Promise<Object>} - Updated transaction status
     */
    static async checkDepositStatus(req, res) {
        try {
            const { reference } = req.params;

            // Find transaction by reference
            const transaction = await Transactions.findByReference(reference);
            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    message: 'Transaction not found'
                });
            }

            // Get recent deposits from BitMart
            const depositHistory = await bitmart.getDepositHistory(
                transaction.currency,
                transaction.createdAt.getTime(),
                Date.now(),
                50
            );

            // Look for matching deposit
            const matchingDeposit = depositHistory.data?.records?.find(deposit => 
                deposit.amount == transaction.amount && 
                deposit.currency === transaction.currency
            );

            if (matchingDeposit) {
                // Update transaction with BitMart data
                await transaction.updateFromBitMart(matchingDeposit);
                
                // If completed, update user balance
                if (transaction.status === 'completed') {
                    await DepositController._updateUserBalance(
                        transaction.userId,
                        transaction.currency,
                        transaction.netAmount
                    );
                }
            }

            res.status(200).json({
                success: true,
                data: {
                    reference: transaction.reference,
                    status: transaction.status,
                    amount: transaction.amount,
                    currency: transaction.currency,
                    txHash: transaction.txHash,
                    confirmations: transaction.confirmations,
                    completedAt: transaction.completedAt
                }
            });

        } catch (error) {
            console.error('Check deposit status error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    
    /**
     * Update user's main balance after successful deposit
     * @param {string} userId - User ID
     * @param {string} currency - Currency symbol
     * @param {number} amount - Amount to add
     * @private
     */
    static async _updateUserBalance(userId, currency, amount) {
        // You'll need a currency mapping system to get coinId
        // For now, using a simple mapping
        const currencyToCoinId = {
            'BTC': 1,
            'ETH': 2,
            'USDT': 3,
            // Add more mappings as needed
        };
        
        const coinId = currencyToCoinId[currency];
        if (!coinId) return;
        
        await MainBalance.findOneAndUpdate(
            { user: userId, coinId: coinId },
            {
                $inc: { balance: amount },
                coinName: currency,
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );
    }
}

/**
 * Internal Transfer Controller
 * Handles transfers between different wallet types (Main, Spot, Futures)
 */
class InternalTransferController {
    
    /**
     * Transfer funds between user's wallets (Main <-> Spot <-> Futures)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {Promise<Object>} - Transfer result
     */
    static async transferBetweenWallets(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const { userId, fromWallet, toWallet, currency, amount } = req.body;
            
            // Validate input
            if (!userId || !fromWallet || !toWallet || !currency || !amount) {
                throw new Error('All fields are required');
            }
            
            if (amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }
            
            if (fromWallet === toWallet) {
                throw new Error('Source and destination wallets must be different');
            }
            
            const validWallets = ['main', 'spot', 'futures'];
            if (!validWallets.includes(fromWallet) || !validWallets.includes(toWallet)) {
                throw new Error('Invalid wallet type');
            }
            
            // Check if user exists
            const user = await Users.findById(userId).session(session);
            if (!user) {
                throw new Error('User not found');
            }
            
            // Get wallet models
            const fromModel = InternalTransferController._getWalletModel(fromWallet);
            const toModel = InternalTransferController._getWalletModel(toWallet);
            
            // Currency mapping (you should have a proper mapping system)
            const currencyToCoinId = {
                'BTC': 1, 'ETH': 2, 'USDT': 3
            };
            const coinId = currencyToCoinId[currency.toUpperCase()];
            
            if (!coinId) {
                throw new Error('Unsupported currency');
            }
            
            // Check source balance
            const fromBalance = await fromModel.findOne({
                user: userId,
                coinId: coinId
            }).session(session);
            
            if (!fromBalance || fromBalance.balance < amount) {
                throw new Error('Insufficient balance');
            }
            
            // Generate reference
            const reference = `TRANSFER-${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            
            // Deduct from source wallet
            await fromModel.findOneAndUpdate(
                { user: userId, coinId: coinId },
                {
                    $inc: { balance: -amount },
                    updatedAt: new Date()
                },
                { session }
            );
            
            // Add to destination wallet
            await toModel.findOneAndUpdate(
                { user: userId, coinId: coinId },
                {
                    $inc: { balance: amount },
                    coinName: currency.toUpperCase(),
                    updatedAt: new Date()
                },
                { upsert: true, new: true, session }
            );
            
            // Create transaction record
            const transaction = new Transactions({
                userId: userId,
                reference: reference,
                type: 'wallet_transfer',
                status: 'completed',
                amount: amount,
                currency: currency.toUpperCase(),
                netAmount: amount,
                notes: `Transfer from ${fromWallet} to ${toWallet}`,
                completedAt: new Date()
            });
            
            await transaction.save({ session });
            
            await session.commitTransaction();
            
            res.status(200).json({
                success: true,
                message: 'Transfer completed successfully',
                data: {
                    reference: reference,
                    fromWallet: fromWallet,
                    toWallet: toWallet,
                    amount: amount,
                    currency: currency.toUpperCase()
                }
            });
            
        } catch (error) {
            await session.abortTransaction();
            console.error('Internal transfer error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Transfer funds between users (P2P transfer)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {Promise<Object>} - Transfer result
     */
    static async transferBetweenUsers(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const { fromUserId, toUserId, currency, amount, walletType = 'main' } = req.body;
            
            // Validate input
            if (!fromUserId || !toUserId || !currency || !amount) {
                throw new Error('All fields are required');
            }
            
            if (amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }
            
            if (fromUserId === toUserId) {
                throw new Error('Cannot transfer to yourself');
            }
            
            // Check if users exist
            const [fromUser, toUser] = await Promise.all([
                Users.findById(fromUserId).session(session),
                Users.findById(toUserId).session(session)
            ]);
            
            if (!fromUser) throw new Error('Sender not found');
            if (!toUser) throw new Error('Recipient not found');
            
            // Get wallet model
            const walletModel = InternalTransferController._getWalletModel(walletType);
            
            // Currency mapping
            const currencyToCoinId = { 'BTC': 1, 'ETH': 2, 'USDT': 3 };
            const coinId = currencyToCoinId[currency.toUpperCase()];
            
            if (!coinId) throw new Error('Unsupported currency');
            
            // Check sender balance
            const fromBalance = await walletModel.findOne({
                user: fromUserId,
                coinId: coinId
            }).session(session);
            
            if (!fromBalance || fromBalance.balance < amount) {
                throw new Error('Insufficient balance');
            }
            
            // Generate reference
            const reference = `P2P-${fromUserId}-${toUserId}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            
            // Deduct from sender
            await walletModel.findOneAndUpdate(
                { user: fromUserId, coinId: coinId },
                {
                    $inc: { balance: -amount },
                    updatedAt: new Date()
                },
                { session }
            );
            
            // Add to recipient
            await walletModel.findOneAndUpdate(
                { user: toUserId, coinId: coinId },
                {
                    $inc: { balance: amount },
                    coinName: currency.toUpperCase(),
                    updatedAt: new Date()
                },
                { upsert: true, new: true, session }
            );
            
            // Create transaction record
            const transaction = new Transactions({
                userId: fromUserId,
                fromUserId: fromUserId,
                toUserId: toUserId,
                reference: reference,
                type: 'internal_transfer',
                status: 'completed',
                amount: amount,
                currency: currency.toUpperCase(),
                netAmount: amount,
                notes: `P2P transfer to user ${toUserId}`,
                completedAt: new Date()
            });
            
            await transaction.save({ session });
            
            await session.commitTransaction();
            
            res.status(200).json({
                success: true,
                message: 'Transfer completed successfully',
                data: {
                    reference: reference,
                    fromUser: fromUser.refCode,
                    toUser: toUser.refCode,
                    amount: amount,
                    currency: currency.toUpperCase()
                }
            });
            
        } catch (error) {
            await session.abortTransaction();
            console.error('P2P transfer error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Get appropriate wallet model based on wallet type
     * @param {string} walletType - Wallet type (main, spot, futures)
     * @returns {Object} - Mongoose model
     * @private
     */
    static _getWalletModel(walletType) {
        switch (walletType.toLowerCase()) {
            case 'main': return MainBalance;
            case 'spot': return SpotBalance;
            case 'futures': return FuturesBalance;
            default: throw new Error('Invalid wallet type');
        }
    }
}

/**
 * Withdrawal Controller
 * Handles cryptocurrency withdrawal operations
 */
class WithdrawalController {
    
    /**
     * Submit withdrawal request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {Promise<Object>} - Withdrawal submission result
     */
    static async submitWithdrawal(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const { userId, currency, amount, address, addressMemo = '', walletType = 'main' } = req.body;
            
            // Validate input
            if (!userId || !currency || !amount || !address) {
                throw new Error('userId, currency, amount, and address are required');
            }
            
            if (amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }
            
            // Check if user exists
            const user = await Users.findById(userId).session(session);
            if (!user) {
                throw new Error('User not found');
            }
            
            // Check if withdrawals are enabled
            const isWithdrawalEnabled = await bitmart.isWithdrawalEnabled(currency);
            if (!isWithdrawalEnabled) {
                throw new Error(`Withdrawals are currently disabled for ${currency}`);
            }
            
            // Get withdrawal quota and fees
            const quotaResponse = await bitmart.getWithdrawalQuota(currency);
            const minWithdraw = quotaResponse.data?.withdraw_min || 0;
            const maxWithdraw = quotaResponse.data?.withdraw_max || Infinity;
            const fee = quotaResponse.data?.withdraw_fee || 0;
            
            if (amount < minWithdraw) {
                throw new Error(`Minimum withdrawal amount is ${minWithdraw} ${currency}`);
            }
            
            if (amount > maxWithdraw) {
                throw new Error(`Maximum withdrawal amount is ${maxWithdraw} ${currency}`);
            }
            
            const totalAmount = amount + fee;
            
            // Get wallet model and check balance
            const walletModel = WithdrawalController._getWalletModel(walletType);
            const currencyToCoinId = { 'BTC': 1, 'ETH': 2, 'USDT': 3 };
            const coinId = currencyToCoinId[currency.toUpperCase()];
            
            if (!coinId) throw new Error('Unsupported currency');
            
            const balance = await walletModel.findOne({
                user: userId,
                coinId: coinId
            }).session(session);
            
            if (!balance || balance.balance < totalAmount) {
                throw new Error(`Insufficient balance. Required: ${totalAmount} ${currency} (including ${fee} fee)`);
            }
            
            // Generate reference
            const reference = `WITHDRAW-${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            
            // Lock the funds (move to lockedBalance)
            await walletModel.findOneAndUpdate(
                { user: userId, coinId: coinId },
                {
                    $inc: { 
                        balance: -totalAmount, 
                        lockedBalance: totalAmount 
                    },
                    updatedAt: new Date()
                },
                { session }
            );
            
            // Submit withdrawal to BitMart
            const withdrawalResponse = await bitmart.submitWithdrawal(
                currency.toUpperCase(),
                amount.toString(),
                'To Digital Address',
                address,
                addressMemo
            );
            
            // Create transaction record
            const transaction = new Transactions({
                userId: userId,
                reference: reference,
                type: 'withdrawal',
                status: 'pending',
                amount: amount,
                currency: currency.toUpperCase(),
                fee: fee,
                netAmount: amount,
                address: address,
                addressMemo: addressMemo,
                externalId: withdrawalResponse.data?.withdraw_id || null,
                notes: `Withdrawal to ${address}`
            });
            
            await transaction.save({ session });
            
            await session.commitTransaction();
            
            res.status(200).json({
                success: true,
                message: 'Withdrawal submitted successfully',
                data: {
                    reference: reference,
                    externalId: withdrawalResponse.data?.withdraw_id,
                    amount: amount,
                    fee: fee,
                    currency: currency.toUpperCase(),
                    address: address,
                    status: 'pending'
                }
            });
            
        } catch (error) {
            await session.abortTransaction();
            console.error('Withdrawal submission error:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Check withdrawal status and update if completed
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {Promise<Object>} - Withdrawal status
     */
    static async checkWithdrawalStatus(req, res) {
        try {
            const { reference } = req.params;
            
            // Find transaction
            const transaction = await Transactions.findByReference(reference);
            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    message: 'Transaction not found'
                });
            }
            
            // Get withdrawal status from BitMart if we have external ID
            if (transaction.externalId) {
                const withdrawalRecord = await bitmart.getWithdrawalRecord(transaction.externalId);
                
                if (withdrawalRecord.data) {
                    const oldStatus = transaction.status;
                    await transaction.updateFromBitMart(withdrawalRecord.data);
                    
                    // If status changed from pending to failed, unlock funds
                    if (oldStatus !== 'failed' && transaction.status === 'failed') {
                        await WithdrawalController._unlockFunds(transaction);
                    }
                }
            }
            
            res.status(200).json({
                success: true,
                data: {
                    reference: transaction.reference,
                    status: transaction.status,
                    amount: transaction.amount,
                    fee: transaction.fee,
                    currency: transaction.currency,
                    address: transaction.address,
                    txHash: transaction.txHash,
                    failureReason: transaction.failureReason,
                    completedAt: transaction.completedAt
                }
            });
            
        } catch (error) {
            console.error('Check withdrawal status error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    
    /**
     * Get appropriate wallet model based on wallet type
     * @param {string} walletType - Wallet type (main, spot, futures)
     * @returns {Object} - Mongoose model
     * @private
     */
    static _getWalletModel(walletType) {
        switch (walletType.toLowerCase()) {
            case 'main': return MainBalance;
            case 'spot': return SpotBalance;
            case 'futures': return FuturesBalance;
            default: throw new Error('Invalid wallet type');
        }
    }
    
    /**
     * Unlock funds when withdrawal fails
     * @param {Object} transaction - Transaction object
     * @private
     */
    static async _unlockFunds(transaction) {
        const walletModel = WithdrawalController._getWalletModel('main'); // Assuming main wallet
        const currencyToCoinId = { 'BTC': 1, 'ETH': 2, 'USDT': 3 };
        const coinId = currencyToCoinId[transaction.currency];
        
        if (coinId) {
            const totalAmount = transaction.amount + transaction.fee;
            await walletModel.findOneAndUpdate(
                { user: transaction.userId, coinId: coinId },
                {
                    $inc: { 
                        balance: totalAmount, 
                        lockedBalance: -totalAmount 
                    },
                    updatedAt: new Date()
                }
            );
        }
    }
}

module.exports = {
    DepositController,
    InternalTransferController,
    WithdrawalController
};