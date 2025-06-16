const cron = require('node-cron');
const { updateTradingWallet, getSpotOrder } = require('../utils/helpers');
const { Transactions } = require('../models/transactions');
const { SpotOrderHistory } = require('../models/spot-order');

/**
 * Get Trading Deposit transactions
 * @returns {Promise<Object>} -
 */
async function checkTradingDepositTransactions() {
    const query = {
        type: { $in: ['deposit_to_spots', 'deposit_to_futures'] },
        status: 'processing',
        webhookStatus: 'completed',
        createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) }
    };

    const transactions = await Transactions.find(query);

    for (const transaction of transactions) {
        console.log(`Processing transaction: ${transaction._id}, type: ${transaction.type}`);
        await updateTradingWallet(transaction);
        console.log(`Updated trading wallet for transaction: ${transaction._id}, type: ${transaction.type}`);
    }
}

/**
 * Get Spot History and Status
 * @returns {Promise<Object>} -
 */
async function getSpotHistoryAndStatus() {
    // Get all pending spot orders and update their status
    await SpotOrderHistory.find({ status: 'pending' }).then(async (orders) => {
        for (const order of orders) {
            console.log("Analyzing Order: ", order);
            await getSpotOrder(order.orderId);
        }
    })
}


// Schedule the cron job to run every minute

cron.schedule('* * * * *', async () => {
    console.log('Running cron job to check trading deposit transactions...');
    await checkTradingDepositTransactions();
    await getSpotHistoryAndStatus();
});

