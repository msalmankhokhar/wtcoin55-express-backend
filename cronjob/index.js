const cron = require('node-cron');
const { distributeExpiredOrderProfits } = require('../utils/helpers');
const { Transactions } = require('../models/transactions');
const { SpotOrderHistory } = require('../models/spot-order');
const { FuturesOrderHistory } = require('../models/future-order');

/**
 * Process Trading Deposit Transactions
 * @returns {Promise<void>}
 */
async function checkTradingDepositTransactions() {
    const filterCriteria = {
        type: { $in: ['deposit_to_spots', 'deposit_to_futures'] },
        status: 'processing',
        webhookStatus: 'completed',
        createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) }
    };

    const depositTransactions = await Transactions.find(filterCriteria);

    for (const transaction of depositTransactions) {
        // Process deposit transactions (simulated)
        console.log(`Processing deposit transaction: ${transaction._id}`);
    }
}

/**
 * Get Spot History and Status
 * @returns {Promise<Object>} -
 */
async function getSpotHistoryAndStatus() {
    console.log('🔍 Starting spot order tracking cronjob...');
    
    try {
        // Debug: Check if the specific order exists
        const specificOrder = await SpotOrderHistory.findOne({ orderId: '1131389971761218048' });
        if (specificOrder) {
            console.log(`🔍 Found specific order: ${specificOrder.orderId}, Status: ${specificOrder.status}, Symbol: ${specificOrder.symbol}, ExecutedQuantity: ${specificOrder.executedQuantity}`);
        } else {
            console.log('❌ Specific order 1131389971761218048 not found in database');
        }
        
    // Get all pending spot orders and update their status
        const pendingOrders = await SpotOrderHistory.find({ status: 'pending' });
        console.log(`📋 Found ${pendingOrders.length} pending spot orders`);
        
        // Also check for orders that might need balance updates (completed/partial_cancelled with fills but no balance updates)
        const ordersNeedingBalanceUpdates = await SpotOrderHistory.find({
            status: { $in: ['completed', 'partial_cancelled', 'partial'] },
            executedQuantity: { $gt: 0 },
            $or: [
                { exchangeFees: { $exists: false } },
                { exchangeFees: 0 },
                { averageExecutionPrice: { $exists: false } },
                { averageExecutionPrice: 0 }
            ]
        });
        
        console.log(`💰 Found ${ordersNeedingBalanceUpdates.length} orders that might need balance updates`);
        
        if (pendingOrders.length === 0 && ordersNeedingBalanceUpdates.length === 0) {
            console.log('✅ No orders to process');
            return;
        }
        
        // Process pending orders
        if (pendingOrders.length > 0) {
            console.log('📊 Pending orders:', pendingOrders.map(order => ({
                orderId: order.orderId,
                symbol: order.symbol,
                side: order.side,
                status: order.status,
                createdAt: order.createdAt
            })));
            
            for (const order of pendingOrders) {
                console.log(`\n🔍 Analyzing Pending Order: ${order.orderId} (${order.symbol})`);
                try {
                    const orderDetails = await getSpotOrder(order.orderId);
                    const updatedOrder = await updateSpotOrder(orderDetails);
                    console.log(`✅ Updated Order: ${updatedOrder ? 'Success' : 'No update needed'}`);
                } catch (error) {
                    console.error(`❌ Error processing order ${order.orderId}:`, error);
                }
            }
        }
        
        // Process orders that might need balance updates
        if (ordersNeedingBalanceUpdates.length > 0) {
            console.log('📊 Orders needing balance updates:', ordersNeedingBalanceUpdates.map(order => ({
                orderId: order.orderId,
                symbol: order.symbol,
                side: order.side,
                status: order.status,
                executedQuantity: order.executedQuantity,
                averageExecutionPrice: order.averageExecutionPrice,
                exchangeFees: order.exchangeFees
            })));
            
            for (const order of ordersNeedingBalanceUpdates) {
                console.log(`\n🔍 Checking Balance Updates for Order: ${order.orderId} (${order.symbol})`);
                try {
                    const orderDetails = await getSpotOrder(order.orderId);
                    if (orderDetails.needsUpdate) {
                        const updatedOrder = await updateSpotOrder(orderDetails);
                        console.log(`✅ Balance Update: ${updatedOrder ? 'Success' : 'No update needed'}`);
                    } else {
                        console.log(`⏭️ No balance update needed for order ${order.orderId}`);
                    }
                } catch (error) {
                    console.error(`❌ Error processing balance update for order ${order.orderId}:`, error);
                }
            }
        }
        
        console.log('✅ Spot order tracking cronjob completed');
        
    } catch (error) {
        console.error('❌ Error in spot order tracking cronjob:', error);
    }
}

/**
 * Get Futures History and Status - Main Cronjob Function
 * @returns {Promise<void>}
 */
async function getFuturesHistoryAndStatus() {
    console.log('🚀 Starting futures order tracking cronjob...');
    
    try {
        // Get all pending futures orders
        const pendingOrders = await FuturesOrderHistory.find({ 
            status: { $in: ['pending', 'triggered', 'partial'] }
        });
        
        console.log(`📋 Found ${pendingOrders.length} orders to check`);
        
        if (pendingOrders.length === 0) {
            console.log('✅ No pending futures orders to check');
            return;
        }

        // Process each order
        for (const order of pendingOrders) {
            try {
                console.log(`\n🔍 Analyzing Order: ${order.orderId} (${order.symbol})`);
                
                // Get latest order details from BitMart
                const orderDetails = await getFuturesOrder(order.orderId, order.symbol);
                
                if (orderDetails.error) {
                    console.error(`❌ Error getting order ${order.orderId}: ${orderDetails.error}`);
                    continue;
                }
                
                // Update order if needed
                const updatedOrder = await updateFuturesOrder(orderDetails);
                
                if (updatedOrder) {
                    console.log(`✅ Successfully updated order ${order.orderId}`);
                } else {
                    console.log(`⏭️  No update needed for order ${order.orderId}`);
                }
                
                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 200));
                
            } catch (orderError) {
                console.error(`❌ Error processing order ${order.orderId}:`, orderError);
                continue; // Continue with next order
            }
        }
        
        console.log('\n✅ Futures order tracking cronjob completed');
        
    } catch (error) {
        console.error('❌ Error in futures order tracking cronjob:', error);
    }
}


// Schedule the cron job to run every minute

cron.schedule('* * * * *', async () => {
    console.log('Running cron job to check trading deposit transactions...');
    await checkTradingDepositTransactions();
    await distributeExpiredOrderProfits();
});

