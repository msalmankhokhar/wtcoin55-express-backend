const { v4: uuidv4 } = require('uuid');
const { Users } = require('../models/users');
const { SpotOrderHistory } = require('../models/spot-order');
const { FuturesOrderHistory } = require('../models/future-order');
const { SpotBalance } = require('../models/spot-balance');
const TransferHistory = require('../models/transfer');

/**
 * Submit real spot order (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function submitSpotOrder(req, res) {
    try {
        const { symbol, side, type, price, quantity, notional, expiration, percentage = 1 } = req.body;
        const user = req.user;

        // Check if user is admin
        if (!user.isAdmin) {
            return res.status(403).json({ 
                error: 'Only admins can place orders' 
            });
        }

        if (!symbol || !side || !type) {
            return res.status(400).json({ error: 'Symbol, side, and type are required' });
        }

        // Validate percentage
        if (percentage < 0.1 || percentage > 100) {
            return res.status(400).json({ error: 'Percentage must be between 0.1 and 100' });
        }

        // Generate order ID and copy code
        const orderId = uuidv4();
        const copyCode = uuidv4().slice(0, 6);

        // Create order history entry (no real API call)
        const { SpotOrderHistory } = require('../models/spot-order');
        const orderHistory = new SpotOrderHistory({
            user: user._id,
            symbol: symbol,
            quantity: quantity || notional,
            price: price || 0,
            side,
            type,
            copyCode,
            orderId: orderId,
            status: 'pending',
            expiration: expiration ? new Date(expiration) : null,
            role: 'admin',
            percentage,
            owner: true,
            followers: []
        });

        await orderHistory.save();

        res.status(200).json({
            success: true,
            message: 'Order submitted successfully (simulated)',
            data: {
                orderId: orderId,
                copyCode: copyCode,
                symbol: symbol,
                side: side,
                type: type,
                quantity: quantity || notional,
                price: price || 0,
                percentage: percentage,
                expiration: expiration
            }
        });

    } catch (error) {
        console.error('Error submitting spot order:', error);
        res.status(500).json({ error: 'Failed to submit spot order' });
    }
}

/**
 * Submit real futures order (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function submitFuturesOrder(req, res) {
    try {
        const { 
            symbol, 
            side, 
            type, 
            leverage = "10", 
            open_type = "cross", 
            size, 
            trigger_price, 
            executive_price, 
            price_way, 
            price_type = 1,
            expiration,
            percentage = 1 
        } = req.body;
        const user = req.user;

        // Check if user is admin
        if (!user.isAdmin) {
            return res.status(403).json({ 
                error: 'Only admins can place futures orders' 
            });
        }

        if (!symbol || !side || !type || !size || !trigger_price) {
            return res.status(400).json({ error: 'Symbol, side, type, size, and trigger_price are required' });
        }

        // Validate percentage
        if (percentage < 0.1 || percentage > 100) {
            return res.status(400).json({ error: 'Percentage must be between 0.1 and 100' });
        }

        // Generate order ID and copy code
        const orderId = uuidv4();
        const copyCode = uuidv4().slice(0, 6);

        // Create futures order history entry (no real API call)
        const orderHistory = new FuturesOrderHistory({
            user: user._id,
            symbol: symbol,
            orderId: orderId,
            side: side,
            type: type,
            leverage: leverage.toString(),
            open_type: open_type,
            size: size,
            trigger_price: trigger_price,
            executive_price: executive_price || trigger_price,
            price_way: price_way || (side === 'buy' ? 1 : 2),
            price_type: price_type,
            status: 'pending',
            copyCode: copyCode,
            owner: true,
            followers: [],
            percentage: percentage,
            expiration: expiration ? new Date(expiration) : null
        });

        await orderHistory.save();

        res.status(200).json({
            success: true,
            message: 'Futures order submitted successfully (simulated)',
            data: {
                orderId: orderId,
                copyCode: copyCode,
                symbol: symbol,
                side: side,
                type: type,
                leverage: leverage,
                size: size,
                trigger_price: trigger_price,
                percentage: percentage,
                expiration: expiration
            }
        });

    } catch (error) {
        console.error('Error submitting futures order:', error);
        res.status(500).json({ error: 'Failed to submit futures order' });
    }
}

/**
 * Get all orders (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAllOrders(req, res) {
    try {
        const user = req.user;

        // Check if user is admin
        if (!user.isAdmin) {
            return res.status(403).json({ 
                error: 'Only admins can view all orders' 
            });
        }

        const orders = await SpotOrderHistory.find({})
            .populate('user', 'email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: orders
        });

    } catch (error) {
        console.error('Error getting all orders:', error);
        res.status(500).json({ error: 'Failed to get all orders' });
    }
}

/**
 * Get all futures orders (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAllFuturesOrders(req, res) {
    try {
        const user = req.user;

        // Check if user is admin
        if (!user.isAdmin) {
            return res.status(403).json({ 
                error: 'Only admins can view all futures orders' 
            });
        }

        const orders = await FuturesOrderHistory.find({})
            .populate('user', 'email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: orders
        });

    } catch (error) {
        console.error('Error getting all futures orders:', error);
        res.status(500).json({ error: 'Failed to get all futures orders' });
    }
}

/**
 * Get available orders for following (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAvailableOrders(req, res) {
    try {
        const user = req.user;
        const { status = 'pending' } = req.query;

        // Check if user is admin
        if (!user.isAdmin) {
            return res.status(403).json({ 
                error: 'Only admins can view available orders' 
            });
        }

        // Build query based on status
        let query = {
            owner: true
        };

        if (status === 'pending') {
            query.status = 'pending';
            query.$or = [
                { expiration: { $exists: false } },
                { expiration: { $gt: new Date() } }
            ];
        } else {
            query.status = status;
        }

        const availableOrders = await SpotOrderHistory.find(query)
            .populate('user', 'email')
            .populate('followers', 'orderId user')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: availableOrders.map(order => ({
                copyCode: order.copyCode,
                symbol: order.symbol,
                side: order.side,
                type: order.type,
                quantity: order.quantity,
                price: order.price,
                percentage: order.percentage,
                expiration: order.expiration,
                status: order.status,
                createdAt: order.createdAt,
                user: order.user.email,
                followers: order.followers.map(follower => ({
                    orderId: follower.orderId,
                    userId: follower.user
                }))
            }))
        });

    } catch (error) {
        console.error('Error getting available orders:', error);
        res.status(500).json({ error: 'Failed to get available orders' });
    }
}

/**
 * Get available futures orders for following (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAvailableFuturesOrders(req, res) {
    try {
        const user = req.user;
        const { status = 'pending' } = req.query;

        // Check if user is admin
        if (!user.isAdmin) {
            return res.status(403).json({ 
                error: 'Only admins can view available futures orders' 
            });
        }

        // Build query based on status
        let query = {
            owner: true
        };

        if (status === 'pending') {
            query.status = 'pending';
            query.$or = [
                { expiration: { $exists: false } },
                { expiration: { $gt: new Date() } }
            ];
        } else {
            query.status = status;
        }

        const availableOrders = await FuturesOrderHistory.find(query)
            .populate('user', 'email')
            .populate('followers', 'orderId user')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: availableOrders.map(order => ({
                copyCode: order.copyCode,
                symbol: order.symbol,
                side: order.side,
                type: order.type,
                quantity: order.quantity,
                price: order.price,
                percentage: order.percentage,
                leverage: order.leverage,
                expiration: order.expiration,
                status: order.status,
                createdAt: order.createdAt,
                user: order.user.email,
                followers: order.followers.map(follower => ({
                    orderId: follower.orderId,
                    userId: follower.user
                }))
            }))
        });

    } catch (error) {
        console.error('Error getting available futures orders:', error);
        res.status(500).json({ error: 'Failed to get available futures orders' });
    }
}

/**
 * Make user admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function makeUserAdmin(req, res) {
    try {
        const { userId } = req.body;
        const adminUser = req.user;

        // Check if current user is admin
        if (!adminUser.isAdmin) {
            return res.status(403).json({ 
                error: 'Only admins can make other users admin' 
            });
        }

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const user = await Users.findByIdAndUpdate(
            userId,
            { isAdmin: true },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({
            success: true,
            message: 'User made admin successfully',
            data: {
                userId: user._id,
                email: user.email,
                isAdmin: user.isAdmin
            }
        });

    } catch (error) {
        console.error('Error making user admin:', error);
        res.status(500).json({ error: 'Failed to make user admin' });
    }
}

/**
 * Remove admin privileges
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function removeAdmin(req, res) {
    try {
        const { userId } = req.body;
        const adminUser = req.user;

        // Check if current user is admin
        if (!adminUser.isAdmin) {
            return res.status(403).json({ 
                error: 'Only admins can remove admin privileges' 
            });
        }

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Prevent removing admin from self
        if (userId === adminUser._id.toString()) {
            return res.status(400).json({ error: 'Cannot remove admin privileges from yourself' });
        }

        const user = await Users.findByIdAndUpdate(
            userId,
            { isAdmin: false },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Admin privileges removed successfully',
            data: {
                userId: user._id,
                email: user.email,
                isAdmin: user.isAdmin
            }
        });

    } catch (error) {
        console.error('Error removing admin privileges:', error);
        res.status(500).json({ error: 'Failed to remove admin privileges' });
    }
}

/**
 * Get all users (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAllUsers(req, res) {
    try {
        const user = req.user;

        // Check if user is admin
        if (!user.isAdmin) {
            return res.status(403).json({ 
                error: 'Only admins can view all users' 
            });
        }

        const users = await Users.find({})
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: users
        });

    } catch (error) {
        console.error('Error getting all users:', error);
        res.status(500).json({ error: 'Failed to get all users' });
    }
}

/**
 * Get all withdrawal requests (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAllWithdrawalRequests(req, res) {
    try {
        const adminUser = req.user;

        // Check if user is admin
        if (!adminUser.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only admins can view all withdrawal requests'
            });
        }

        const { WithdrawalRequest } = require('../models/withdrawal');
        const requests = await WithdrawalRequest.find({})
            .populate('user', 'email phonenumber')
            .populate('approvedBy', 'email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: requests
        });

    } catch (error) {
        console.error('Error getting all withdrawal requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get withdrawal requests'
        });
    }
}

/**
 * Approve withdrawal request (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function approveWithdrawalRequest(req, res) {
    try {
        const adminUser = req.user;
        const { requestId } = req.params;

        console.log(`🔍 [approveWithdrawalRequest] Request ID received: "${requestId}"`);
        console.log(`🔍 [approveWithdrawalRequest] Request ID type: ${typeof requestId}`);
        console.log(`🔍 [approveWithdrawalRequest] Request ID length: ${requestId?.length}`);

        // Check if user is admin
        if (!adminUser.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only admins can approve withdrawal requests'
            });
        }

        if (!requestId) {
            return res.status(400).json({
                success: false,
                message: 'Request ID is required'
            });
        }

        const { WithdrawalRequest } = require('../models/withdrawal');
        const { MainBalance, SpotBalance, FuturesBalance } = require('../models/balance');
        const { Transactions } = require('../models/transactions');
        const ccpayment = require('../utils/ccpayment');
        const { v4: uuidv4 } = require('uuid');

        // Validate ObjectId format
        const { ObjectId } = require('mongodb');
        if (!ObjectId.isValid(requestId)) {
            console.log(`❌ [approveWithdrawalRequest] Invalid ObjectId format: "${requestId}"`);
            return res.status(400).json({
                success: false,
                message: 'Invalid request ID format. Expected a valid MongoDB ObjectId.',
                receivedId: requestId
            });
        }

        console.log(`✅ [approveWithdrawalRequest] Valid ObjectId format, searching for withdrawal request...`);

        // Find the withdrawal request
        const withdrawalRequest = await WithdrawalRequest.findById(requestId)
            .populate('user', 'email');

        if (!withdrawalRequest) {
            console.log(`❌ [approveWithdrawalRequest] Withdrawal request not found for ID: "${requestId}"`);
            return res.status(404).json({
                success: false,
                message: 'Withdrawal request not found',
                requestId: requestId
            });
        }

        console.log(`✅ [approveWithdrawalRequest] Found withdrawal request: ${withdrawalRequest._id}, Status: ${withdrawalRequest.status}`);

        if (withdrawalRequest.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Withdrawal request is not pending'
            });
        }

        // Check user balance again (in case it changed)
        let userBalance;
        if (withdrawalRequest.walletType === 'main') {
            userBalance = await MainBalance.findOne({ 
                user: withdrawalRequest.user._id, 
                coinId: withdrawalRequest.coinId 
            });
        }

        if (!userBalance || userBalance.balance < withdrawalRequest.amount) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance for withdrawal'
            });
        }

        // Update request status to approved
        withdrawalRequest.status = 'approved';
        withdrawalRequest.approvedBy = adminUser._id;
        withdrawalRequest.approvedAt = new Date();
        withdrawalRequest.updatedAt = new Date();

        await withdrawalRequest.save();

        // Execute the actual withdrawal
        try {
            await executeWithdrawal(withdrawalRequest);
        } catch (withdrawalError) {
            console.error('Error executing withdrawal:', withdrawalError);
            
            // Update request status to failed
            withdrawalRequest.status = 'failed';
            withdrawalRequest.updatedAt = new Date();
            await withdrawalRequest.save();

            return res.status(500).json({
                success: false,
                message: 'Withdrawal approved but execution failed'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Withdrawal request approved and executed successfully',
            data: {
                requestId: withdrawalRequest._id,
                status: withdrawalRequest.status
            }
        });

    } catch (error) {
        console.error('Error approving withdrawal request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve withdrawal request'
        });
    }
}

/**
 * Decline withdrawal request (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function declineWithdrawalRequest(req, res) {
    try {
        const adminUser = req.user;
        const { requestId } = req.params;
        const { reason } = req.body;

        console.log(`🔍 [declineWithdrawalRequest] Request ID received: "${requestId}"`);
        console.log(`🔍 [declineWithdrawalRequest] Request ID type: ${typeof requestId}`);
        console.log(`🔍 [declineWithdrawalRequest] Request ID length: ${requestId?.length}`);

        // Check if user is admin
        if (!adminUser.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only admins can decline withdrawal requests'
            });
        }

        if (!requestId) {
            return res.status(400).json({
                success: false,
                message: 'Request ID is required'
            });
        }

        const { WithdrawalRequest } = require('../models/withdrawal');

        // Validate ObjectId format
        const { ObjectId } = require('mongodb');
        if (!ObjectId.isValid(requestId)) {
            console.log(`❌ [declineWithdrawalRequest] Invalid ObjectId format: "${requestId}"`);
            return res.status(400).json({
                success: false,
                message: 'Invalid request ID format. Expected a valid MongoDB ObjectId.',
                receivedId: requestId
            });
        }

        console.log(`✅ [declineWithdrawalRequest] Valid ObjectId format, searching for withdrawal request...`);

        // Find the withdrawal request
        const withdrawalRequest = await WithdrawalRequest.findById(requestId);

        if (!withdrawalRequest) {
            console.log(`❌ [declineWithdrawalRequest] Withdrawal request not found for ID: "${requestId}"`);
            return res.status(404).json({
                success: false,
                message: 'Withdrawal request not found',
                requestId: requestId
            });
        }

        console.log(`✅ [declineWithdrawalRequest] Found withdrawal request: ${withdrawalRequest._id}, Status: ${withdrawalRequest.status}`);

        if (withdrawalRequest.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Withdrawal request is not pending'
            });
        }

        // Update request status to declined
        withdrawalRequest.status = 'declined';
        withdrawalRequest.approvedBy = adminUser._id;
        withdrawalRequest.declineReason = reason || 'No reason provided';
        withdrawalRequest.updatedAt = new Date();

        await withdrawalRequest.save();

        res.status(200).json({
            success: true,
            message: 'Withdrawal request declined successfully',
            data: {
                requestId: withdrawalRequest._id,
                status: withdrawalRequest.status,
                declineReason: withdrawalRequest.declineReason
            }
        });

    } catch (error) {
        console.error('Error declining withdrawal request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to decline withdrawal request'
        });
    }
}

/**
 * Execute the actual withdrawal (internal function)
 * @param {Object} withdrawalRequest - The withdrawal request object
 */
async function executeWithdrawal(withdrawalRequest) {
    try {
        const { coinId, coinName, amount, address, chain, memo, walletType } = withdrawalRequest;
        const { MainBalance, SpotBalance, FuturesBalance } = require('../models/balance');
        const { Transactions } = require('../models/transactions');
        const ccpayment = require('../utils/ccpayment');
        const { v4: uuidv4 } = require('uuid');
        
        // Generate order ID
        const orderId = `${withdrawalRequest.user.toString()}${uuidv4()}`;
        
        // Prepare withdrawal details for CCPayment
        const withdrawalDetails = {
            coinId,
            address,
            orderId,
            chain: chain === 'TRC20' ? 'TRX' : chain === 'ERC20' ? 'ETH' : chain,
            amount: amount.toString(),
            merchantPayNetworkFee: true,
            memo
        };

        // Execute withdrawal via CCPayment
        const response = await ccpayment.applyAppWithdrawToNetwork(withdrawalDetails);
        const { code, msg, data } = JSON.parse(response);

        if (code === 10000 && msg === "success") {
            // Update withdrawal request with execution details
            withdrawalRequest.status = 'processing';
            withdrawalRequest.orderId = orderId;
            withdrawalRequest.recordId = data.recordId;
            withdrawalRequest.processedAt = new Date();
            withdrawalRequest.updatedAt = new Date();

            await withdrawalRequest.save();

            // Deduct amount from user's balance
            let userBalance;
            if (walletType === 'main') {
                userBalance = await MainBalance.findOne({ 
                    user: withdrawalRequest.user, 
                    coinId: coinId 
                });
            } else if (walletType === 'spot') {
                userBalance = await SpotBalance.findOne({ 
                    user: withdrawalRequest.user, 
                    coinId: coinId 
                });
            } else if (walletType === 'futures') {
                userBalance = await FuturesBalance.findOne({ 
                    user: withdrawalRequest.user, 
                    coinId: coinId 
                });
            }

            if (userBalance) {
                userBalance.balance -= amount;
                await userBalance.save();
            }

            // Create transaction record
            const transaction = new Transactions({
                user: withdrawalRequest.user,
                coinId,
                currency: coinName,
                amount,
                address,
                chain,
                memo,
                orderId,
                recordId: data.recordId,
                status: 'processing',
                type: 'withdrawal'
            });

            await transaction.save();

            console.log(`✅ Withdrawal executed successfully for request ${withdrawalRequest._id}`);
        } else {
            throw new Error(`CCPayment withdrawal failed: ${msg}`);
        }

    } catch (error) {
        console.error('Error executing withdrawal:', error);
        throw error;
    }
}

/**
 * Get order details by orderId (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getOrderDetails(req, res) {
    try {
        const adminUser = req.user;
        const { orderId } = req.body;

        // Check if user is admin
        if (!adminUser.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only admins can view order details'
            });
        }

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required'
            });
        }

        // Find the order and populate all related data
        const order = await SpotOrderHistory.findOne({ orderId })
            .populate('user', 'email phonenumber')
            .populate('followers', 'orderId user')
            .populate({
                path: 'followers',
                populate: {
                    path: 'user',
                    select: 'email'
                }
            });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Format followers data
        const formattedFollowers = order.followers.map(follower => ({
            orderId: follower.orderId,
            userEmail: follower.user.email,
            status: follower.status,
            createdAt: follower.createdAt
        }));

        res.status(200).json({
            success: true,
            data: {
                orderId: order.orderId,
                copyCode: order.copyCode,
                symbol: order.symbol,
                side: order.side,
                type: order.type,
                quantity: order.quantity,
                price: order.price,
                percentage: order.percentage,
                expiration: order.expiration,
                status: order.status,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
                executedAt: order.executedAt,
                owner: order.owner,
                user: {
                    email: order.user.email,
                    phonenumber: order.user.phonenumber
                },
                followers: formattedFollowers,
                executedQuantity: order.executedQuantity,
                averageExecutionPrice: order.averageExecutionPrice,
                exchangeFees: order.exchangeFees,
                trades: order.trades
            }
        });

    } catch (error) {
        console.error('Error getting order details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get order details'
        });
    }
}

/**
 * Get all transfer history (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAllTransfers(req, res) {
    try {
        const { page = 1, limit = 20, status, transferType, coinId } = req.query;
        const skip = (page - 1) * limit;

        let query = {};
        
        if (status) query.status = status;
        if (transferType) query.transferType = transferType;
        if (coinId) query.coinId = coinId;

        const transfers = await TransferHistory.find(query)
            .populate('user', 'email firstName lastName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await TransferHistory.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                transfers,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Error getting all transfers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get transfer history'
        });
    }
}

/**
 * Get transfer statistics (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getTransferStats(req, res) {
    try {
        const { period = '30d' } = req.query;
        
        let dateFilter = {};
        const now = new Date();
        
        switch (period) {
            case '7d':
                dateFilter = { createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
                break;
            case '30d':
                dateFilter = { createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
                break;
            case '90d':
                dateFilter = { createdAt: { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } };
                break;
            default:
                dateFilter = { createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
        }

        // Total transfers
        const totalTransfers = await TransferHistory.countDocuments(dateFilter);
        
        // Total volume transferred
        const volumeResult = await TransferHistory.aggregate([
            { $match: dateFilter },
            { $group: { _id: null, totalVolume: { $sum: '$amount' } } }
        ]);
        const totalVolume = volumeResult.length > 0 ? volumeResult[0].totalVolume : 0;

        // Total fees collected
        const feesResult = await TransferHistory.aggregate([
            { $match: { ...dateFilter, fee: { $gt: 0 } } },
            { $group: { _id: null, totalFees: { $sum: '$fee' } } }
        ]);
        const totalFees = feesResult.length > 0 ? feesResult[0].totalFees : 0;

        // Transfers by type
        const transfersByType = await TransferHistory.aggregate([
            { $match: dateFilter },
            { $group: { _id: '$transferType', count: { $sum: 1 }, volume: { $sum: '$amount' } } }
        ]);

        // Transfers by status
        const transfersByStatus = await TransferHistory.aggregate([
            { $match: dateFilter },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Top coins by volume
        const topCoins = await TransferHistory.aggregate([
            { $match: dateFilter },
            { $group: { _id: '$coinName', volume: { $sum: '$amount' }, count: { $sum: 1 } } },
            { $sort: { volume: -1 } },
            { $limit: 10 }
        ]);

        res.status(200).json({
            success: true,
            data: {
                period,
                totalTransfers,
                totalVolume,
                totalFees,
                transfersByType,
                transfersByStatus,
                topCoins
            }
        });

    } catch (error) {
        console.error('Error getting transfer stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get transfer statistics'
        });
    }
}

/**
 * Get user transfer details (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUserTransferDetails(req, res) {
    try {
        const { userId } = req.params;
        const { coinId, accountType } = req.query;

        let query = { user: userId };
        if (coinId) query.coinId = coinId;
        if (accountType) query.toAccount = accountType;

        const transfers = await TransferHistory.find(query)
            .populate('user', 'email firstName lastName')
            .sort({ createdAt: -1 });

        // Get trading volume status if coinId and accountType are provided
        let volumeStatus = null;
        if (coinId && accountType) {
            const { getTradingVolumeStatus } = require('../utils/tradingVolume');
            volumeStatus = await getTradingVolumeStatus(userId, coinId, accountType);
        }

        res.status(200).json({
            success: true,
            data: {
                transfers,
                volumeStatus
            }
        });

    } catch (error) {
        console.error('Error getting user transfer details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user transfer details'
        });
    }
}

module.exports = {
    submitSpotOrder,
    submitFuturesOrder,
    getAllOrders,
    getAllFuturesOrders,
    getAvailableOrders,
    getAvailableFuturesOrders,
    makeUserAdmin,
    removeAdmin,
    getAllUsers,
    getAllWithdrawalRequests,
    approveWithdrawalRequest,
    declineWithdrawalRequest,
    getOrderDetails,
    getAllTransfers,
    getTransferStats,
    getUserTransferDetails
}; 