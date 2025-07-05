const SpotOrderHistory = require('../models/spot-order');
const FutureOrderHistory = require('../models/future-order');
const TransferHistory = require('../models/transfer');
const TradingVolume = require('../models/tradingVolume');

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
 * Get or create a TradingVolume record for a user and coin
 * @param {ObjectId} userId - User ID
 * @param {String} coinId - Coin ID
 * @param {String} coinName - Coin name
 * @returns {Promise<Object>} TradingVolume document
 */
async function getOrCreateTradingVolume(userId, coinId, coinName) {
    try {
        let tradingVolume = await TradingVolume.findOne({ user: userId, coinId });

        if (!tradingVolume) {
            tradingVolume = new TradingVolume({
                user: userId,
                coinId,
                coinName,
                totalTradingVolume: 0,
                requiredVolume: 0
            });
            await tradingVolume.save();
        }

        return tradingVolume;
    } catch (error) {
        console.error('Error getting or creating trading volume:', error);
        throw error;
    }
}

/**
 * Update trading volume for a user and coin
 * @param {ObjectId} userId - User ID
 * @param {String} coinId - Coin ID
 * @param {Number} volumeToAdd - Volume to add to current trading volume
 * @returns {Promise<Object>} Updated TradingVolume document
 */
async function updateTradingVolume(userId, coinId, volumeToAdd) {
    try {
        const tradingVolume = await TradingVolume.findOneAndUpdate(
            { user: userId, coinId },
            { 
                $inc: { totalTradingVolume: volumeToAdd },
                lastUpdated: new Date(),
                updatedAt: new Date()
            },
            { new: true, upsert: true }
        );
        
        return tradingVolume;
    } catch (error) {
        console.error('Error updating trading volume:', error);
        throw error;
    }
}

/**
 * Set required volume for a user and coin
 * @param {ObjectId} userId - User ID
 * @param {String} coinId - Coin ID
 * @param {Number} requiredVolume - Required volume to set
 * @returns {Promise<Object>} Updated TradingVolume document
 */
async function setRequiredVolume(userId, coinId, requiredVolume) {
    try {
        const tradingVolume = await TradingVolume.findOneAndUpdate(
            { user: userId, coinId },
            { 
                requiredVolume,
                updatedAt: new Date()
            },
            { new: true, upsert: true }
        );
        
        return tradingVolume;
    } catch (error) {
        console.error('Error setting required volume:', error);
        throw error;
    }
}

/**
 * Get trading volume status for a user and coin
 * @param {ObjectId} userId - User ID
 * @param {String} coinId - Coin ID
 * @returns {Promise<Object>} Trading volume status object
 */
async function getTradingVolumeStatus(userId, coinId) {
    try {
        const tradingVolume = await TradingVolume.findOne({ user: userId, coinId });
        
        if (!tradingVolume) {
            return {
                totalTradingVolume: 0,
                requiredVolume: 0,
                volumeMet: true,
                remainingVolume: 0
            };
        }

        const volumeMet = tradingVolume.totalTradingVolume >= tradingVolume.requiredVolume;
        const remainingVolume = Math.max(0, tradingVolume.requiredVolume - tradingVolume.totalTradingVolume);

        return {
            totalTradingVolume: tradingVolume.totalTradingVolume,
            requiredVolume: tradingVolume.requiredVolume,
            volumeMet,
            remainingVolume
        };
    } catch (error) {
        console.error('Error getting trading volume status:', error);
        throw error;
    }
}

/**
 * Link balance to trading volume
 * @param {ObjectId} balanceId - Balance document ID
 * @param {String} balanceModel - Model name ('SpotBalance' or 'FuturesBalance')
 * @param {ObjectId} tradingVolumeId - TradingVolume document ID
 * @returns {Promise<Object>} Updated balance document
 */
async function linkBalanceToTradingVolume(balanceId, balanceModel, tradingVolumeId) {
    try {
        const BalanceModel = require(`../models/${balanceModel.toLowerCase()}`);
        
        const updatedBalance = await BalanceModel.findByIdAndUpdate(
            balanceId,
            { 
                tradingVolumeId,
                updatedAt: new Date()
            },
            { new: true }
        );
        
        return updatedBalance;
    } catch (error) {
        console.error('Error linking balance to trading volume:', error);
        throw error;
    }
}

/**
 * Update total required volume by summing spot and futures required volumes
 * @param {ObjectId} userId - User ID
 * @param {String} coinId - Coin ID
 * @param {Number} spotRequiredVolume - Required volume from spot balance
 * @param {Number} futuresRequiredVolume - Required volume from futures balance
 * @returns {Promise<Object>} Updated TradingVolume document
 */
async function updateTotalRequiredVolume(userId, coinId, spotRequiredVolume = 0, futuresRequiredVolume = 0) {
    try {
        const totalRequiredVolume = spotRequiredVolume + futuresRequiredVolume;
        
        const tradingVolume = await TradingVolume.findOneAndUpdate(
            { user: userId, coinId },
            { 
                requiredVolume: totalRequiredVolume,
                updatedAt: new Date()
            },
            { new: true, upsert: true }
        );
        
        return tradingVolume;
    } catch (error) {
        console.error('Error updating total required volume:', error);
        throw error;
    }
}

module.exports = {
    calculateTradingProfit,
    calculateTradeProfit,
    getOrCreateTradingVolume,
    updateTradingVolume,
    setRequiredVolume,
    getTradingVolumeStatus,
    linkBalanceToTradingVolume,
    updateTotalRequiredVolume
}; 