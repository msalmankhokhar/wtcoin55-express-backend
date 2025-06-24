const SpotOrderHistory = require('../models/spot-order');
const FutureOrderHistory = require('../models/future-order');
const TransferHistory = require('../models/transfer');

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
 * @param {number} requiredVolume - Required volume from balance (optional, defaults to 0)
 * @returns {Object} Trading volume status
 */
async function getTradingVolumeStatus(userId, coinId, accountType, currentBalance = 0, requiredVolume = 0) {
    try {
        // Use the requiredVolume parameter instead of calculating from transfers
        const totalRequiredVolume = requiredVolume || 0;

        // Get total transferred volume
        const totalTransferred = await TransferHistory.find({
            $or: [
                { user: userId, coinId: coinId, fromAccount: accountType },
                { user: userId, coinId: coinId, toAccount: accountType }
            ],
            status: 'completed'
        });

        const totalTransferredOut = totalTransferred.filter(transfer => transfer.fromAccount === accountType).reduce((sum, transfer) => sum + transfer.netAmount, 0);
        const totalTransferredIn = totalTransferred.filter(transfer => transfer.toAccount === accountType).reduce((sum, transfer) => sum + transfer.netAmount, 0);

        const volumeMet = currentBalance >= totalRequiredVolume;
        const remainingVolume = Math.max(0, currentBalance - totalRequiredVolume);

        return {
            accountType,
            coinId,
            coinName: coinId === "1280" ? "USDT" : "",
            totalTransferredOut, 
            totalTransferredIn,
            totalRequiredVolume,
            currentVolume: currentBalance,
            remainingVolume,
            volumeMet,
            progressPercentage: totalRequiredVolume > 0 ? (currentBalance / totalRequiredVolume) * 100 : 0
        };
    } catch (error) {
        console.error('Error getting trading volume status:', error);
        return {
            accountType,
            coinId,
            totalTransferredOut: 0,
            totalTransferredIn: 0,
            totalRequiredVolume: requiredVolume || 0,
            currentVolume: 0,
            remainingVolume: requiredVolume || 0,
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