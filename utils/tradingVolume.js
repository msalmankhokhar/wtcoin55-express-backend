const { SpotOrderHistory } = require('../models/spot-order');
const { FutureOrderHistory } = require('../models/future-order');

/**
 * Calculate trading profit for a user's specific coin and account type
 * @param {string} userId - User ID
 * @param {string} coinId - Coin ID
 * @param {string} accountType - 'spot' or 'futures'
 * @returns {number} Total profit from completed trades
 */
async function calculateTradingProfit(userId, coinId, accountType) {
    try {
        let totalProfit = 0;

        if (accountType === 'spot') {
            // Get all completed spot orders for this user and coin
            const completedOrders = await SpotOrderHistory.find({
                user: userId,
                status: 'completed',
                // You might need to adjust this filter based on how coinId is stored in orders
                // For now, we'll calculate profit from all completed orders
            });

            completedOrders.forEach(order => {
                if (order.trades && order.trades.length > 0) {
                    // Calculate profit from trades
                    order.trades.forEach(trade => {
                        const tradeProfit = calculateTradeProfit(order, trade);
                        totalProfit += tradeProfit;
                    });
                }
            });
        } else if (accountType === 'futures') {
            // Get all completed futures orders for this user and coin
            const completedOrders = await FutureOrderHistory.find({
                user: userId,
                status: 'completed',
                // You might need to adjust this filter based on how coinId is stored in orders
            });

            completedOrders.forEach(order => {
                if (order.trades && order.trades.length > 0) {
                    // Calculate profit from trades
                    order.trades.forEach(trade => {
                        const tradeProfit = calculateTradeProfit(order, trade);
                        totalProfit += tradeProfit;
                    });
                }
            });
        }

        return totalProfit;
    } catch (error) {
        console.error('Error calculating trading profit:', error);
        return 0;
    }
}

/**
 * Calculate profit from a single trade
 * @param {Object} order - Order object
 * @param {Object} trade - Trade object
 * @returns {number} Profit from this trade
 */
function calculateTradeProfit(order, trade) {
    try {
        if (!order || !trade) return 0;

        const quantity = trade.quantity || 0;
        const tradePrice = trade.price || 0;
        const orderPrice = order.price || 0;

        if (order.side === 'buy') {
            // For buy orders, profit = (trade_price - order_price) * quantity
            return (tradePrice - orderPrice) * quantity;
        } else if (order.side === 'sell') {
            // For sell orders, profit = (order_price - trade_price) * quantity
            return (orderPrice - tradePrice) * quantity;
        }

        return 0;
    } catch (error) {
        console.error('Error calculating trade profit:', error);
        return 0;
    }
}

/**
 * Get trading volume status for a user
 * @param {string} userId - User ID
 * @param {string} coinId - Coin ID
 * @param {string} accountType - 'spot' or 'futures'
 * @returns {Object} Trading volume status
 */
async function getTradingVolumeStatus(userId, coinId, accountType) {
    try {
        const { TransferHistory } = require('../models/transfer');
        
        // Get all transfers to this account
        const transfers = await TransferHistory.find({
            user: userId,
            toAccount: accountType,
            coinId,
            status: 'completed'
        });

        // Calculate total required volume
        let totalRequiredVolume = 0;
        let totalTransferred = 0;

        transfers.forEach(transfer => {
            totalRequiredVolume += transfer.requiredVolume || 0;
            totalTransferred += transfer.amount || 0;
        });

        // Get user's trading profit
        const tradingProfit = await calculateTradingProfit(userId, coinId, accountType);

        const volumeMet = tradingProfit >= totalRequiredVolume;
        const remainingVolume = Math.max(0, totalRequiredVolume - tradingProfit);

        return {
            accountType,
            coinId,
            totalTransferred,
            totalRequiredVolume,
            currentVolume: tradingProfit,
            remainingVolume,
            volumeMet,
            progressPercentage: totalRequiredVolume > 0 ? (tradingProfit / totalRequiredVolume) * 100 : 0
        };
    } catch (error) {
        console.error('Error getting trading volume status:', error);
        return {
            accountType,
            coinId,
            totalTransferred: 0,
            totalRequiredVolume: 0,
            currentVolume: 0,
            remainingVolume: 0,
            volumeMet: false,
            progressPercentage: 0
        };
    }
}

module.exports = {
    calculateTradingProfit,
    calculateTradeProfit,
    getTradingVolumeStatus
}; 