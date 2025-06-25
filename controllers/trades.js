const { v4: uuidv4 } = require('uuid');
const { Users } = require('../models/users');
const { SpotOrderHistory } = require('../models/spot-order');
const { FuturesOrderHistory } = require('../models/future-order');
const SpotBalance = require('../models/spot-balance');
const FuturesBalance = require('../models/futures-balance');
const { getProfitPercentage } = require('../utils/helpers');

/**
 * Follow spot order (simulated - generates fake profitable order)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function followSpotOrder(req, res) {
    try {
        const { copyCode } = req.body;
        const user = req.user;

        if (!copyCode) {
            return res.status(400).json({ error: 'Copy code is required' });
        }

        // Find the original order
        const originalOrder = await SpotOrderHistory.findOne({ 
            copyCode, 
            owner: true,
            status: 'pending'
        });

        if (!originalOrder) {
            return res.status(404).json({ error: 'Order not found or not available for following' });
        }

        // Check if order has expired
        if (originalOrder.expiration && new Date() > originalOrder.expiration) {
            return res.status(400).json({ error: 'Order has expired' });
        }

        // Check if user has already followed this order
        const existingFollower = await SpotOrderHistory.findOne({ 
            user: user._id,
            copyCode
        });
        
        if (existingFollower) {
            return res.status(400).json({ error: 'You have already followed this order' });
        }

        // Check user balance
        const coinName = originalOrder.symbol.split('_')[1] || originalOrder.symbol.split('-')[1] || 'USDT';
        let balance;
        balance = await SpotBalance.find({ user: user._id });
        console.log(balance);
        
        if (coinName === 'USDT') {
            balance = await SpotBalance.findOne({ user: user._id, coinId: "1280" });
        } else {
            balance = await SpotBalance.findOne({ user: user._id, coinName: coinName });
        }

        if (!balance || balance.balance < originalOrder.limit_price) {
            return res.status(400).json({ error: 'Insufficient balance to follow this order' });
        }

        // Generate fake order ID
        const fakeOrderId = uuidv4();
        const currentPrice = originalOrder.price;
        const profitPercentage = originalOrder.percentage;
        
        // Calculate profit based on the percentage
        let finalPrice;
        
        if (originalOrder.side === 'buy') {
            // For buy orders, we simulate price increase
            finalPrice = currentPrice * (1 + profitPercentage / 100);
        } else {
            // For sell orders, we simulate price decrease
            finalPrice = currentPrice * (1 - profitPercentage / 100);
        }

        // Create follower order (pending profit distribution)
        const followerOrder = new SpotOrderHistory({
            user: user._id,
            symbol: originalOrder.symbol,
            quantity: originalOrder.quantity,
            price: currentPrice,
            side: originalOrder.side,
            type: originalOrder.type,
            copyCode: copyCode,
            orderId: fakeOrderId,
            status: 'pending_profit', // New status for orders waiting for profit
            owner: false,
            role: 'follower',
            percentage: profitPercentage,
            executedQuantity: originalOrder.quantity,
            averageExecutionPrice: finalPrice,
            expiration: originalOrder.expiration, // Inherit expiration from original order
            trades: [{
                tradeId: uuidv4(),
                price: finalPrice,
                quantity: originalOrder.quantity,
                fee: 0,
                role: 'taker',
                timestamp: new Date()
            }]
        });

        await followerOrder.save();

        res.status(200).json({
            success: true,
            message: 'Order followed successfully. Profit will be distributed at expiration.',
            data: {
                orderId: fakeOrderId,
                copyCode: copyCode,
                symbol: originalOrder.symbol,
                side: originalOrder.side,
                originalPrice: currentPrice,
                expectedFinalPrice: finalPrice,
                profitPercentage: profitPercentage,
                expiration: originalOrder.expiration,
                status: 'pending_profit'
            }
        });

    } catch (error) {
        console.error('Error following spot order:', error);
        res.status(500).json({ error: 'Failed to follow spot order' });
    }
}

/**
 * Follow futures order (simulated - generates fake profitable order)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function followFuturesOrder(req, res) {
    try {
        const { copyCode } = req.body;
        const user = req.user;

        if (!copyCode) {
            return res.status(400).json({ error: 'Copy code is required' });
        }

        // Check if user has vip tier
        const { VipTier } = require('../models/vip');

        const vipTier = await VipTier.findById(user.vipTier);
        if (!vipTier || vipTier.vipLevel === 0) {
            return res.status(400).json({ error: 'User has no vip tier, please contact admin' });
        }

        // Find the original futures order
        const originalOrder = await FuturesOrderHistory.findOne({ 
            copyCode,
            owner: true,
            status: 'pending'
        });

        console.log(originalOrder);

        if (!originalOrder) {
            return res.status(404).json({ error: 'Futures order not found or order has expired' });
        }

        // Check if order has expired
        if (originalOrder.expiration && new Date() > originalOrder.expiration) {
            return res.status(400).json({ error: 'Futures order has expired' });
        }

        // Check if user has already followed this order
        const existingFollower = await FuturesOrderHistory.findOne({ 
            user: user._id,
            copyCode
        });

        if (existingFollower) {
            return res.status(400).json({ error: 'You have already followed this order' });
        }

        // Check user futures balance
        const coinName = originalOrder.symbol.split('_')[1] || originalOrder.symbol.split('-')[1] || 'USDT';
        console.log(coinName);
        let balance;

        if (coinName === 'USDT') {
            balance = await FuturesBalance.findOne({ user: user._id, coinId: "1280" });
            if (!balance) {
                balance = await FuturesBalance.findOne({ user: user._id, coinName: "USDT" });
            }
        } else {
            balance = await FuturesBalance.findOne({ user: user._id, coinName: coinName });
        }

        if (!balance || balance.balance < originalOrder.limit_price) {
            return res.status(400).json({ error: 'Insufficient futures balance to follow this order' });
        }

        // Generate fake order ID
        const fakeOrderId = uuidv4();
        const currentPrice = parseFloat(originalOrder.trigger_price);
        const profitPercentage = await getProfitPercentage(user.vipTier);

        // Calculate profit based on the percentage
        let finalPrice;
        
        if (originalOrder.price_way === 1) { // Long position
            // For long positions, we simulate price increase
            finalPrice = currentPrice * (1 + profitPercentage / 100);
        } else { // Short position
            // For short positions, we simulate price decrease
            finalPrice = currentPrice * (1 - profitPercentage / 100);
        }

        // Create follower futures order (pending profit distribution)
        const followerOrder = new FuturesOrderHistory({
            user: user._id,
            symbol: originalOrder.symbol,
            orderId: fakeOrderId,
            side: originalOrder.side,
            type: originalOrder.type,
            leverage: originalOrder.leverage,
            open_type: originalOrder.open_type,
            size: originalOrder.size,
            trigger_price: originalOrder.trigger_price,
            executive_price: originalOrder.executive_price,
            price_way: originalOrder.price_way,
            price_type: originalOrder.price_type,
            status: 'pending_profit', // New status for orders waiting for profit
            copyCode: copyCode,
            owner: false,
            followers: [],
            percentage: profitPercentage,
            executed_price: finalPrice.toString(),
            executed_quantity: originalOrder.size,
            executed_at: new Date(),
            expiration: originalOrder.expiration // Inherit expiration from original order
        });

        await followerOrder.save();

        res.status(200).json({
            success: true,
            message: 'Futures order followed successfully. Profit will be distributed at expiration.',
            data: {
                orderId: fakeOrderId,
                copyCode: copyCode,
                symbol: originalOrder.symbol,
                side: originalOrder.side,
                originalPrice: currentPrice,
                expectedFinalPrice: finalPrice,
                profitPercentage: profitPercentage,
                expiration: originalOrder.expiration,
                status: 'pending_profit',
                leverage: originalOrder.leverage,
                size: originalOrder.size
            }
        });

    } catch (error) {
        console.error('Error following futures order:', error);
        res.status(500).json({ error: 'Failed to follow futures order' });
    }
}

/**
 * Get available orders for following
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAvailableOrders(req, res) {
    try {
        const availableOrders = await SpotOrderHistory.find({
            user: req.user._id,
            status: 'pending',
            $or: [
                { expiration: { $exists: false } },
                { expiration: { $gt: new Date() } }
            ]
        }).populate('user', 'email');

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
                createdAt: order.createdAt,
                user: order.user.email
            }))
        });

    } catch (error) {
        console.error('Error getting available orders:', error);
        res.status(500).json({ error: 'Failed to get available orders' });
    }
}

/**
 * Get user's order history (only their own orders)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUserOrders(req, res) {
    try {
        const user = req.user;
        const orders = await SpotOrderHistory.find({ user: user._id })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: orders
        });

    } catch (error) {
        console.error('Error getting user orders:', error);
        res.status(500).json({ error: 'Failed to get user orders' });
    }
}

/**
 * Get user's futures order history (only their own orders)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getFuturesOrders(req, res) {
    try {
        const user = req.user;
        const orders = await FuturesOrderHistory.find({ user: user._id })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: orders
        });

    } catch (error) {
        console.error('Error getting user futures orders:', error);
        res.status(500).json({ error: 'Failed to get user futures orders' });
    }
}

module.exports = {
    followSpotOrder,
    followFuturesOrder,
    getAvailableOrders,
    getUserOrders,
    getFuturesOrders
}; 