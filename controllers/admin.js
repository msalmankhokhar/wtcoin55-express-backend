const { v4: uuidv4 } = require('uuid');
const { Users } = require('../models/users');
const { SpotOrderHistory } = require('../models/spot-order');
const { FuturesOrderHistory } = require('../models/future-order');
const { VipTier } = require('../models/vip');
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

        if (
            symbol == null || symbol === '' ||
            side == null ||  // Allow 0 as valid value
            type == null || type === '' ||
            size == null ||  // Allow 0 as valid value  
            trigger_price == null || trigger_price === ''
        ) {
            console.log("Symbol: ", symbol);
            console.log("Side: ", side);
            console.log("Type: ", type);
            console.log("Size: ", size);
            console.log("Trigger price: ", trigger_price);
            return res.status(400).json({ 
                error: 'Symbol, side, type, size, and trigger_price are required' 
            });
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

        const users = await Users.find({ isAdmin: false })
            .populate('vipTier', '_id vipName vipLevel')
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
        const CcPayment = require('../utils/ccpayment');
        const ccpayment = new CcPayment(process.env.CCPAYMENT_APP_SECRET, process.env.CCPAYMENT_APP_ID, process.env.CCPAYMENT_BASE_URL);
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
        const CcPayment = require('../utils/ccpayment');
        const ccpayment = new CcPayment(process.env.CCPAYMENT_APP_SECRET, process.env.CCPAYMENT_APP_ID, process.env.CCPAYMENT_BASE_URL);
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

async function kycVerification(req, res) {
    try {
        const { kycId } = req.params;
        const { status } = req.body;

        const { kycVerification: KYCVerificationModel } = require('../models/kycVerification');

        const validateObjectId = require('mongoose').Types.ObjectId.isValid(kycId);
        if (!validateObjectId) {    
            return res.status(400).json({ 
                success: false,
                error: 'Invalid KYC verification ID format' 
            });
        }

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid status. Must be either "approved" or "rejected"' 
            });
        }

        const kycRecord = await KYCVerificationModel.findById(kycId);
        if (!kycRecord) {
            return res.status(404).json({ 
                success: false,
                error: 'KYC verification not found' 
            });
        }

        if (kycRecord.status !== 'pending') {
            return res.status(400).json({ 
                success: false,
                error: 'KYC verification has already been processed' 
            });
        }

        await Users.findByIdAndUpdate(kycRecord.user, 
            { kycVerification: status === 'approved' ? true : false },
            { new: true }
        );

        kycRecord.status = status;
        await kycRecord.save();

        res.status(200).json({
            success: true,
            message: 'KYC verification updated successfully',
            data: {
                kycId: kycRecord._id,
                status: kycRecord.status,
                fullName: kycRecord.fullName,
                updatedAt: kycRecord.updatedAt
            }
        });

    } catch (error) {
        console.error('Error updating KYC verification:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update KYC verification'
        });
    }
}

async function getKycVerification(req, res) {
    try {
        const { kycVerification: KYCVerificationModel } = require('../models/kycVerification');
        
        const { status, page = 1, limit = 20 } = req.query;
        
        // Build query filter
        let query = {};
        if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            query.status = status;
        }
        
        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = parseInt(limit);
        
        // Get KYC verifications with user details
        const kycVerifications = await KYCVerificationModel.find(query)
            .populate('user', 'email firstName lastName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);
            
        // Get total count for pagination
        const totalCount = await KYCVerificationModel.countDocuments(query);

        res.status(200).json({
            success: true,
            data: kycVerifications,
            pagination: {
                page: parseInt(page),
                limit: limitNum,
                total: totalCount,
                pages: Math.ceil(totalCount / limitNum)
            }
        });

    } catch (error) {
        console.error('Error getting KYC verification:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get KYC verification data'
        });
    }
}

async function updateUserBalance(req, res) {
    try {
        const { userId } = req.params;
        const { newBalance } = req.body;

        const user = await Users.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        const coinId = "1280";

        const { MainBalance } = require('../models/balance');
        const mainBalance = await MainBalance.findOne({ user: userId, coinId });
        if (!mainBalance) {
            return res.status(404).json({
                success: false,
                error: 'Main balance not found'
            });
        }

        mainBalance.balance = newBalance;
        await mainBalance.save();

        res.status(200).json({
            success: true,
            message: 'User balance updated successfully'
        });

    } catch(error) {
        console.error('Error updating user balance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user balance'
        });
    }
}

async function getUserBalance(req, res) {
    try {
        const { userId } = req.query;

        const { MainBalance } = require('../models/balance');
        const SpotBalance = require('../models/spot-balance');
        const FuturesBalance = require('../models/futures-balance');
            
        // If userId is provided, get balance for specific user
        if (userId) {
        const user = await Users.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        let balances = {};

        // Get Main Balance
        balances['main'] = await MainBalance.find({ user: userId });

        // Get Spot Balances
        balances['spot'] = await SpotBalance.find({ user: userId });

        // Get Futures Balances
        balances['futures'] = await FuturesBalance.find({ user: userId });

            // Create USDT balance for main wallet if empty
            if (!balances.main || balances.main.length === 0) {
                const usdtMainBalance = new MainBalance({
                    user: userId,
                    coinId: '1280',
                    coinName: 'USDT',
                    currency: 'USDT',
                    chain: 'ETH',
                    balance: 0
                });
                await usdtMainBalance.save();
                balances['main'] = [usdtMainBalance];
            }

            // Create USDT balance for spot wallet if empty
            if (!balances.spot || balances.spot.length === 0) {
                const usdtSpotBalance = new SpotBalance({
                    user: userId,
                    coinId: '1280',
                    coinName: 'USDT',
                    currency: 'USDT',
                    chain: 'ETH',
                    balance: 0
                });
                await usdtSpotBalance.save();
                balances['spot'] = [usdtSpotBalance];
            }

            // Create USDT balance for futures wallet if empty
            if (!balances.futures || balances.futures.length === 0) {
                const usdtFuturesBalance = new FuturesBalance({
                    user: userId,
                    coinId: '1280',
                    coinName: 'USDT',
                    currency: 'USDT',
                    chain: 'ETH',
                    balance: 0
                });
                await usdtFuturesBalance.save();
                balances['futures'] = [usdtFuturesBalance];
        }

        return res.status(200).json({
            success: true,
            data: balances
            });
        } else {
            // If no userId provided, get all users' balances
            const allUsers = await Users.find({});
            const allBalances = [];

            for (const user of allUsers) {
                const userBalances = {
                    userId: user._id,
                    email: user.email,
                    balances: {}
                };

                // Get Main Balance
                userBalances.balances['main'] = await MainBalance.find({ user: user._id });

                // Get Spot Balances
                userBalances.balances['spot'] = await SpotBalance.find({ user: user._id });

                // Get Futures Balances
                userBalances.balances['futures'] = await FuturesBalance.find({ user: user._id });

                // Create USDT balance for main wallet if empty
                if (!userBalances.balances.main || userBalances.balances.main.length === 0) {
                    const usdtMainBalance = new MainBalance({
                        user: user._id,
                        coinId: '1280',
                        coinName: 'USDT',
                        currency: 'USDT',
                        chain: 'ETH',
                        balance: 0
                    });
                    await usdtMainBalance.save();
                    userBalances.balances['main'] = [usdtMainBalance];
                }

                // Create USDT balance for spot wallet if empty
                if (!userBalances.balances.spot || userBalances.balances.spot.length === 0) {
                    const usdtSpotBalance = new SpotBalance({
                        user: user._id,
                        coinId: '1280',
                        coinName: 'USDT',
                        currency: 'USDT',
                        chain: 'ETH',
                        balance: 0
                    });
                    await usdtSpotBalance.save();
                    userBalances.balances['spot'] = [usdtSpotBalance];
                }

                // Create USDT balance for futures wallet if empty
                if (!userBalances.balances.futures || userBalances.balances.futures.length === 0) {
                    const usdtFuturesBalance = new FuturesBalance({
                        user: user._id,
                        coinId: '1280',
                        coinName: 'USDT',
                        currency: 'USDT',
                        chain: 'ETH',
                        balance: 0
                    });
                    await usdtFuturesBalance.save();
                    userBalances.balances['futures'] = [usdtFuturesBalance];
                }

                allBalances.push(userBalances);
            }

            return res.status(200).json({
                success: true,
                data: allBalances,
                totalUsers: allBalances.length
            });
        }
    } catch(error) {
        console.error('Error getting user balance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user balance'
        });
    }
}

async function updateUserVipTier(req, res) {
    try {
        const { userId } = req.params;
        const { vipTierId } = req.body;

        const user = await Users.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const vipTier = await VipTier.findById(vipTierId);
        if (!vipTier) {
            return res.status(404).json({
                success: false,
                error: 'Vip tier not found'
            });
        }

        user.vipTier = vipTierId;
        await user.save();

        return res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Error updating vip tier:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update vip tier'
        });
    }
}

async function getVipTier(req, res) {
    try {
        const vipTiers = await VipTier.find({}).sort({ vipLevel: 1 });
        return res.status(200).json({
            success: true,
            data: vipTiers
        });
    } catch (error) {
        console.error('Error getting vip tiers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get vip tiers'
        });
    }
}

async function updateVipTier(req, res) {
    try {
        const { vipTierId } = req.params;
        const { vipName, vipLevel, vipStatus, vipPercentage } = req.body;

        const vipTier = await VipTier.findById(vipTierId);
        if (!vipTier) {
            return res.status(404).json({
                success: false,
                error: 'Vip tier not found'
            });
        }

        vipTier.vipName = vipName || vipTier.vipName;
        vipTier.vipLevel = vipLevel || vipTier.vipLevel;
        vipTier.vipStatus = vipStatus || vipTier.vipStatus;
        vipTier.vipPercentage = vipPercentage || vipTier.vipPercentage;
        await vipTier.save();

        return res.status(200).json({
            success: true,
            data: vipTier
        });
    } catch (error) {
        console.error('Error updating vip tier:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update vip tier'
        });
    }
}

async function deleteVipTier(req, res) {
    try {
        const { vipTierId } = req.params;
        const vipTier = await VipTier.findById(vipTierId);
        if (!vipTier) {
            return res.status(404).json({
                success: false,
                error: 'Vip tier not found'
            });
        }

        const users = await Users.find({ vipTier: vipTierId });
        for (const user of users) {
            user.vipTier = null;
            await user.save();
        }

        await vipTier.deleteOne();

        return res.status(200).json({
            success: true,
            message: 'Vip tier deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting vip tier:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete vip tier'
        });
    }
}

async function addVipTier(req, res) {
    try {
        const { vipName, vipLevel, vipStatus, vipPercentage } = req.body;

        if (!vipName || !vipLevel || !vipStatus || !vipPercentage) {
            return res.status(400).json({
                success: false,
                error: 'Required field missing'
            })
        }
        const levelExist = await VipTier.find({ vipLevel: vipLevel });

        if (levelExist.length !== 0) {
            // console.log(levelExist);
            return res.status(406).json({
                success: false,
                error: 'Vip level already exists'
            });
        }

        const vipTier = new VipTier({
            vipName,
            vipLevel,
            vipStatus,
            vipPercentage
        });
        await vipTier.save();

        return res.status(200).json({
            success: true,
            data: vipTier
        });
    } catch(error) {
        console.error('Error adding vip tier:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to adding vip tier'
        });
    }
}

/**
 * Update all users' refCode and refBy to 7 characters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateRefCodesToSevenChars(req, res) {
    try {
        const adminUser = req.user;

        // Check if user is admin
        if (!adminUser.isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Only admins can update ref codes'
            });
        }

        console.log('🔄 Starting refCode and refBy update process...');

        // Get all users
        const allUsers = await Users.find({});
        console.log(`📋 Found ${allUsers.length} users to process`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const user of allUsers) {
            try {
                let needsUpdate = false;
                const updates = {};

                // Check and update refCode
                if (user.refCode && user.refCode.length > 7) {
                    updates.refCode = user.refCode.slice(0, 7);
                    needsUpdate = true;
                    console.log(`📝 User ${user.email}: refCode updated from "${user.refCode}" to "${updates.refCode}"`);
                }

                // Check and update refBy
                if (user.refBy && user.refBy.length > 7) {
                    updates.refBy = user.refBy.slice(0, 7);
                    needsUpdate = true;
                    console.log(`📝 User ${user.email}: refBy updated from "${user.refBy}" to "${updates.refBy}"`);
                }

                // Update user if needed
                if (needsUpdate) {
                    await Users.findByIdAndUpdate(user._id, updates);
                    updatedCount++;
                } else {
                    skippedCount++;
                }

            } catch (userError) {
                console.error(`❌ Error updating user ${user.email}:`, userError);
            }
        }

        console.log(`✅ Ref code update completed!`);
        console.log(`📊 Summary: ${updatedCount} users updated, ${skippedCount} users skipped`);

        res.status(200).json({
            success: true,
            message: 'Ref codes updated successfully',
            data: {
                totalUsers: allUsers.length,
                updatedCount,
                skippedCount
            }
        });

    } catch (error) {
        console.error('Error updating ref codes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update ref codes'
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
    getUserTransferDetails,
    kycVerification,
    getKycVerification,
    getUserBalance,
    updateUserBalance,
    updateUserVipTier,
    getVipTier,
    addVipTier,
    updateVipTier,
    deleteVipTier,
    updateRefCodesToSevenChars
}; 