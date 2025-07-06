const cron = require('node-cron');
const { distributeExpiredOrderProfits, updateUserVipTier } = require('../utils/helpers');
const { Transactions } = require('../models/transactions');
const { SpotOrderHistory } = require('../models/spot-order');
const { FuturesOrderHistory } = require('../models/future-order');
const { Users } = require('../models/users');
const { VipTier } = require('../models/vip');
const SpotBalance = require('../models/spot-balance');
const FuturesBalance = require('../models/futures-balance');
const TradingVolume = require('../models/tradingVolume');
// const { updateTotalRequiredVolume } = require('../utils/tradingVolume');


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
            status: { $in: ['pending', 'pending_profit', 'triggered', 'partial'] }
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

async function updateUserVipTierCronjob() {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    
    const users = await Users.find({
        $or: [
            // Users with vipLastUpdated more than 10 days ago
            { 
                vipLastUpdated: { $lt: tenDaysAgo },
                vipTier: { $exists: true, $ne: null }
            },
            // Users with null vipLastUpdated but have a vipTier
            { 
                vipLastUpdated: null,
                vipTier: { $exists: true, $ne: null }
            },
            // Users with vipTier null
            { 
                vipTier: null
            }
        ]
    });
    
    for (const user of users) {
        try {
            if (user.vipTier === null) {
                // Find default VIP tier (level 1)
                const defaultVipTier = await VipTier.findOne({ vipLevel: 0 });
                if (defaultVipTier) {
                    user.vipTier = defaultVipTier._id;
                    console.log(`Assigned default VIP tier (level 1) to user: ${user.email}`);
                } else {
                    console.log(`No default VIP tier found for user: ${user.email}`);
                    continue;
                }
            }
            
            // Call the helper function that updates balance with profit
            const response = await updateUserVipTier(user._id, user.vipTier);
            if (response) {
                // Update vipLastUpdated to current time
                user.vipLastUpdated = new Date();
                await user.save();
                console.log(`Updated VIP tier for user: ${user.email}, vipLastUpdated: ${user.vipLastUpdated}`);
            }
            
        } catch (error) {
            console.error(`Error updating VIP tier for user ${user.email}:`, error);
        }
    }
}

/**
 * Update Total Trading Volume by summing requiredVolume from spot and futures balances
 * @returns {Promise<void>}
 */
async function updateTotalTradingVolume() {
    console.log('📊 Starting total trading volume update cronjob...');
   
    try {
        // Get all user balances for USDT (coinId: "1280")
        const userSpotBalances = await SpotBalance.find({ coinId: "1280" });
        const userFuturesBalances = await FuturesBalance.find({ coinId: "1280" });
        
        console.log(`📈 Found ${userSpotBalances.length} spot balances and ${userFuturesBalances.length} futures balances for USDT`);
        
        // Create maps for efficient lookup
        const spotBalanceMap = new Map();
        const futuresBalanceMap = new Map();
        
        // Populate spot balance map
        userSpotBalances.forEach(balance => {
            if (balance.user) {
                spotBalanceMap.set(balance.user.toString(), balance);
            }
        });
        
        // Populate futures balance map
        userFuturesBalances.forEach(balance => {
            if (balance.user) {
                futuresBalanceMap.set(balance.user.toString(), balance);
            }
        });
        
        // Get all unique user IDs from both spot and futures
        const allUserIds = new Set([
            ...spotBalanceMap.keys(),
            ...futuresBalanceMap.keys()
        ]);
        
        console.log(`👥 Processing ${allUserIds.size} unique users`);
        
        // Process each unique user ONCE
        for (const userIdString of allUserIds) {
            const userSpotBalance = spotBalanceMap.get(userIdString);
            const userFuturesBalance = futuresBalanceMap.get(userIdString);

            // console.log(`👤 User ${userIdString}:`);
            // console.log(`   Spot requiredVolume: ${userSpotBalance.requiredVolume}`);
            // console.log(`   Futures requiredVolume: ${userFuturesBalance.requiredVolume}`);
            // console.log(`   Total requiredVolume: ${userSpotBalance.requiredVolume + userFuturesBalance.requiredVolume}`);
            // console.log(`   Spot tradingVolume: ${userSpotBalance.balance}`);
            // console.log(`   Futures tradingVolume: ${userFuturesBalance.balance}`);
            // console.log(`   Total tradingVolume: ${userSpotBalance.balance + userFuturesBalance.balance}`);
            
            // Calculate total required volume (spot + futures)
            const spotRequiredVolume = userSpotBalance ? (userSpotBalance.requiredVolume || 0) : 0;
            const futuresRequiredVolume = userFuturesBalance ? (userFuturesBalance.requiredVolume || 0) : 0;
            const totalRequiredVolume = spotRequiredVolume + futuresRequiredVolume;

            // Calculate total trading Volume from spot and futures
            const spotTradingVolume = userSpotBalance ? (userSpotBalance.balance || 0) : 0;
            const futuresTradingVolume = userFuturesBalance ? (userFuturesBalance.balance || 0) : 0;
            const totalTradingVolume = spotTradingVolume + futuresTradingVolume;

            // Get existing trading volume record for this user
            let tradingVolumeRecord = await TradingVolume.findOne({ 
                user: userIdString
            });

            // Debug logging for specific user (commented out to reduce noise)
            // if (userIdString === "6846ede676072017c59d938c") {
            //     console.log(`👤 User ${userIdString}:`);
            //     console.log(`   Spot requiredVolume: ${userSpotBalance.requiredVolume}`);
            //     console.log(`   Futures requiredVolume: ${userFuturesBalance.requiredVolume}`);
            //     console.log(`   Total requiredVolume: ${userSpotBalance.requiredVolume + userFuturesBalance.requiredVolume}`);
            //     console.log(`   Spot tradingVolume: ${userSpotBalance.balance}`);
            //     console.log(`   Futures tradingVolume: ${userFuturesBalance.balance}`);
            //     console.log(`   Total tradingVolume: ${userSpotBalance.balance + userFuturesBalance.balance}`);
                
            //     // Debug the existing record
            //     if (tradingVolumeRecord) {
            //         console.log(`   Existing record totalTradingVolume: ${tradingVolumeRecord.totalTradingVolume} (type: ${typeof tradingVolumeRecord.totalTradingVolume})`);
            //         console.log(`   Calculated totalTradingVolume: ${totalTradingVolume} (type: ${typeof totalTradingVolume})`);
            //         console.log(`   Are they equal? ${tradingVolumeRecord.totalTradingVolume === totalTradingVolume}`);
            //         console.log(`   Are they strictly equal? ${tradingVolumeRecord.totalTradingVolume === totalTradingVolume}`);
            //     }
            // }

            // If no record exists, create one
            if (!tradingVolumeRecord) {
                const newRecord = {
                    user: userIdString,
                    coinId: "1280",
                    coinName: "USDT",
                    totalTradingVolume: totalTradingVolume,
                    requiredVolume: totalRequiredVolume
                };

                console.log(`🔍 Creating record with data:`, JSON.stringify(newRecord, null, 2));

                tradingVolumeRecord = new TradingVolume(newRecord);
                await tradingVolumeRecord.save();
                console.log(`✅ Created new trading volume record for user ${userIdString}: ${totalRequiredVolume}`);
            } else {
                // Update if the totalTradingVolume is different
                if (Number(tradingVolumeRecord.totalTradingVolume) !== Number(totalTradingVolume) || Number(tradingVolumeRecord.requiredVolume) !== Number(totalRequiredVolume)) {
                    const oldValue = tradingVolumeRecord.totalTradingVolume;
                    tradingVolumeRecord.totalTradingVolume = totalTradingVolume;
                    tradingVolumeRecord.requiredVolume = totalRequiredVolume;
                    tradingVolumeRecord.lastUpdated = new Date();
                    
                    await tradingVolumeRecord.save();
                    console.log(`📈 Updated trading volume for user ${userIdString}: ${oldValue} -> ${totalTradingVolume}`);
                }
            }
        }
        
        console.log('✅ Total trading volume update cronjob completed successfully');
        
    } catch (error) {
        console.error('❌ Error in total trading volume update cronjob:', error);
        console.error('❌ Error stack:', error.stack);
    }
}


// Schedule the cron job to run every minute

cron.schedule('* * * * *', async () => {
    console.log('Running cron job to check trading deposit transactions...');
    // await checkTradingDepositTransactions();
    await distributeExpiredOrderProfits();
    await updateUserVipTierCronjob();
    // await getSpotHistoryAndStatus();
    // await getFuturesHistoryAndStatus(); 
    await updateTotalTradingVolume();
});

