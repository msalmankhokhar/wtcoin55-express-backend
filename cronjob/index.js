const cron = require('node-cron');
const { updateTradingWallet } = require('../utils/helpers');
const { Transactions } = require('../models/transactions');

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
// Schedule the cron job to run every minute

cron.schedule('* * * * *', async () => {
    console.log('Running cron job to check trading deposit transactions...');
    await checkTradingDepositTransactions();
});
