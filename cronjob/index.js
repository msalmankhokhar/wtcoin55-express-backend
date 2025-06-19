const cron = require('node-cron');
const { updateTradingWallet, getSpotOrder, updateSpotOrder,
    updateFuturesOrder, getFuturesOrder
 } = require('../utils/helpers');
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
        await updateTradingWallet(transaction);
    }
}

/**
 * Get Spot History and Status
 * @returns {Promise<Object>} -
 */
async function getSpotHistoryAndStatus() {
    // Get all pending spot orders and update their status
    let orderDetails;
    await SpotOrderHistory.find({ status: 'pending' }).then(async (orders) => {
        console.log(orders);
        for (const order of orders) {
            console.log("Analyzing Order: ", order);
            orderDetails = await getSpotOrder(order.orderId);
            console.log("Updated Order: ", await updateSpotOrder(orderDetails));
        }
    })
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
    await getSpotHistoryAndStatus();
    await getFuturesHistoryAndStatus();
});

