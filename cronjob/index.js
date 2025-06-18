const cron = require('node-cron');
const { updateTradingWallet, getSpotOrder, updateSpotOrder } = require('../utils/helpers');
const { Transactions } = require('../models/transactions');
const { SpotOrderHistory } = require('../models/spot-order');

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
        for (const order of orders) {
            console.log("Analyzing Order: ", order);
            orderDetails = await getSpotOrder(order.orderId);
            console.log("Updated Order: ", await updateSpotOrder(orderDetails));
        }
    })
}


// Schedule the cron job to run every minute

cron.schedule('* * * * *', async () => {
    console.log('Running cron job to check trading deposit transactions...');
    await checkTradingDepositTransactions();
    await getSpotHistoryAndStatus();
});

