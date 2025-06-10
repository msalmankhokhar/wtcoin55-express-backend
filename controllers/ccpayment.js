const Ccpayment = require('../utils/ccpayment');
const Bitmart = require('../utils/bitmart');
const { v4: uuidv4 } = require('uuid');
const { Address } = require('../models/address');
const { MainBalance } = require('../models/balance');
const { SpotBalance } = require('../models/spot-balance');
const { FuturesBalance } = require('../models/futures-balance');
const { Transactions } = require('../models/transactions');
const { handleDepositWebhook, handleWithdrawWebhook } = require('../webhooks/ccpayment');
const crypto = require('crypto');


// SET UP
const appSecret = process.env.CCPAYMENT_APP_SECRET;
const appId = process.env.CCPAYMENT_APP_ID;
const ccpaymentBaseUrl = process.env.CCPAYMENT_BASE_URL || "https://ccpayment.com/ccpayment/v2";

// console.log("CCPayment Config:", {
//     appSecret: appSecret ? '***' : 'Not Set',
//     appId: appId ? '***' : 'Not Set',
//     baseUrl: baseUrl ? baseUrl : 'Not Set'
// });
const ccpayment = new Ccpayment(
    appSecret,
    appId,
    baseUrl=ccpaymentBaseUrl
);

const bitmartAccessKey = process.env.BITMART_ACCESS_KEY
const bitmartSecretKey = process.env.BITMART_SECRET_KEY
const bitmartMemo = process.env.BITMART_MEMO
const bitmartBaseUrl = process.env.BITMART_BASE_URL || "https://api-cloud-v2.bitmart.com";

console.log("Bitmart Config:", {
    accessKey: bitmartAccessKey ? '***' : 'Not Set',
    secretKey: bitmartSecretKey ? '***' : 'Not Set',
    memo: bitmartMemo ? "***" : 'Not Set',
    baseUrl: bitmartBaseUrl ? bitmartBaseUrl : 'Not Set'
});

const bitmart = new Bitmart(
    accessKey=bitmartAccessKey,
    secretKey=bitmartSecretKey,
    memo=bitmartMemo,
    baseUrl=bitmartBaseUrl
);

// Handlers
//

// Route handler for getting coin list
async function getCoinListHandler(req, res) {
    try {
        const coinList = await ccpayment.getCoinList();
        // console.log(coinList);
        res.json({ success: true, data: JSON.parse(coinList) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

async function getChainListHandler(req, res) {
    try {
        const { chains } = req.body;
        const result = await ccpayment.getChainList(chains);
        res.json({ success: true, data: JSON.parse(result) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

async function getAppCoinAssetListHandler(req, res) {
    try {
        const result = await ccpayment.getAppCoinAssetList();
        res.json({ success: true, data: JSON.parse(result) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

async function getAppCoinAssetHandler(req, res) {
    try {
        const { coinId } = req.body;
        const result = await ccpayment.getAppCoinAsset(coinId);
        res.json({ success: true, data: JSON.parse(result) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

async function getOrCreateAppDepositAddressHandler(req, res) {
    try {
        const { chain } = req.body;
        const user = req.user; // Assuming user is attached to request

        // Check if user already has an address for this chain
        const existingAddress = await Address.findOne({
            user: user._id,
            chain: chain
        });

        if (existingAddress) {
            return res.json({
                success: true,
                data: {
                    address: existingAddress.address,
                    memo: existingAddress.memo,
                    chain: existingAddress.chain
                }
            });
        }

        // If no existing address, create new one
        const referenceId = `${user._id.toString()}${uuidv4()}`;
        const response = await ccpayment.getOrCreateAppDepositAddress(chain, referenceId);
        const { code, msg, data } = JSON.parse(response);
        if (code === 10000 && msg === "success") {
            const { address, memo } = data;
            try {
                // Save the new address to the database
                console.log(data);
                const newAddress = new Address({
                    user: user._id,
                    chain: chain,
                    address: address,
                    memo: memo
                });
                await newAddress.save();
                return res.json({ success: true, data: { address, memo, chain } });
            } catch (saveError) {
                // If there's a duplicate key error, we can ignore it since we already have the compound index
                if (saveError.code !== 11000) {
                    throw saveError;
                }
                console.log(`Address already exists for user and chain combination, continuing...`);
            }
        } else {
            console.error(`Failed to generate address for chain: ${chain}`);
            return res.status(500).json({ success: false, error: msg });
        }

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

async function getAppDepositRecordListHandler(req, res) {
    try {
        const result = await ccpayment.getAppDepositRecordList();
        console.log("result::", result);
        res.json({ success: true, data: JSON.parse(result) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

async function applyAppWithdrawToNetworkHandler(req, res) {
    try {
        const user = req.user; // Assuming user is attached to the request
        const { coinId, address, amount, chain, memo } = req.body;

        // Check user's balance
        const userBalance = await MainBalance.findOne({ user: user._id, coinId });
        const newBalance = userBalance - amount;

        if (!userBalance || userBalance.balance < amount || newBalance <= 0) {
            return res.status(400).json({
                status: false,
                message: "Insufficient balance",
            });
        }

        // Prepare withdrawal details
        const orderId = `${user._id.toString()}${uuidv4()}`;
        const withdrawalDetails = {
            coinId,
            address,
            orderId,
            chain,
            amount: amount.toString(),
            merchantPayNetworkFee: true,
            memo
        };

        // Call the applyAppWithdrawToNetwork function from utils
        const response = await ccpayment.applyAppWithdrawToNetwork(withdrawalDetails);

        // Parse the response
        const { code, msg, data } = JSON.parse(response);
        if (code === 10000 && msg === "success") {
            // Deduct the amount from user's balance
            userBalance.balance -= amount;
            await userBalance.save();

            // Record the withdrawal in history
            const withdrawalHistory = new Transactions({
                user: user._id,
                coinId,
                amount,
                address,
                chain,
                memo,
                orderId,
                recordId: data.recordId,
                status: 'Processing',
                type: 'withdrawal'
            });

            await withdrawalHistory.save();

            return res.status(200).json({
                status: true,
                message: "Withdrawal applied successfully",
                data: data
            });
        } else {
            return res.status(400).json({
                status: false,
                message: "Failed to apply withdrawal",
                error: msg
            });
        }
    } catch (error) {
        console.log("error::", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
            error: error.message
        });
    }
};


async function withdrawToDerivativeWalletHandler(req, res){
    try {
        const user = req.user; // Assuming user is attached to the request
        const { amount, destination, coinId, chain, memo="" } = req.body;
        let type;

        if (destination !== 'spots' || destination !== 'futures') {
            return res.status(400).json({
                status: false,
                message: "Invalid destination. Only 'spots' or 'futures' are allowed.",
            });
        }

        // Check out the type
        type = destination === 'spots' ? 'deposit_to_spots' : 'deposit_to_futures';

        // Check user's balance
        const userBalance = await MainBalance.findOne({ user: user._id, coinId });

        const newBalance = userBalance - amount;

        if (!userBalance || userBalance.balance < amount || newBalance <= 0) {
            return res.status(400).json({
                status: false,
                message: "Insufficient balance",
            });
        }

        const coinName = userBalance.coinName;

        // Check if coin exists in bitmart
        if (chain.toUpperCase() === 'TRX') {
            // For TRX, we need to use the TRC20 chain
            chain = 'TRC20';
            currency = `${coinName.toUpperCase()}-${chain.toUpperCase()}`;
        } else if (chain.toUpperCase() === 'BSC') {
            chain = 'BSC_BNB';
            currency = `${coinName.toUpperCase()}-${chain.toUpperCase()}`;
        } else if (chain.toUpperCase() === coinName.toUpperCase()) {
            currency = `${coinName.toUpperCase()}`;
        } else if (chain.toUpperCase() === 'AVAX') {
            chain = 'AVAX_C';
            currency = `${coinName.toUpperCase()}-${chain.toUpperCase()}`;
        } else if (chain.toUpperCase() === 'SOL' && coinName.toUpperCase() === 'USDC') {
            chain = 'SPL';
            currency = `${coinName.toUpperCase()}-${chain.toUpperCase()}`;

        } else {
            currency = `${coinName.toUpperCase()}-${chain.toUpperCase()}`;
        }
        
        const toAddress = await bitmart.getDepositAddress(currency);

        if (!toAddress.code || toAddress.code !== 10000) {
            console.log("Coin not supported:", currency);
            return res.status(400).json({ message: 'Coin is not supported' });
        }
        const address = toAddress.data.address;

        // Check the coin in CCPayment
        if (memo=== undefined || memo === null || memo === "") {
            const fromAddress = await Address.findOne({ user: user._id, coinId });
            if (!fromAddress) {
                return res.status(400).json({ message: 'Coin not found in your account. Please Deposit' });
            }
            memo = fromAddress.memo || "";
        }

        // Prepare withdrawal details
        const orderId = `${user._id.toString()}${uuidv4()}`;
        const withdrawalDetails = {
            coinId,
            address: toAddress.address,
            orderId,
            chain,
            currency, // For Bitmart, we need to specify the currency
            amount: amount.toString(),
            merchantPayNetworkFee: true,
            memo
        };

        // Call the applyAppWithdrawToNetwork function from utils
        const response = await ccpayment.applyAppWithdrawToNetwork(withdrawalDetails);

        // Parse the response
        const { code, msg, data } = JSON.parse(response);
        if (code === 10000 && msg === "success") {
            // Deduct the amount from user's balance
            userBalance.balance -= amount;
            await userBalance.save();

            // Record the withdrawal in history
            const withdrawalHistory = new Transactions({
                user: user._id,
                coinId,
                amount,
                currency: coinName,
                address,
                chain,
                memo,
                orderId,
                recordId: data.recordId,
                status: 'Processing',
                type
            });

            await withdrawalHistory.save();

            // const notifications = [
            //     { user: user, content: `${amount} ${chain} withdrawal to ${address} was successful`, type: 'CRYPTO_WITHDRAWAL' },
            // ];

            // const notification_object = await addNotifications(notifications);
            // if (notification_object) {
            //     console.log("Notifications added successfully:", notification_object);
            // } else {
            //     console.error("Failed to add notifications.");
            // }

            return res.status(200).json({
                status: true,
                message: "Withdrawal applied successfully",
                data: data
            });
        } else {
            return res.status(400).json({
                status: false,
                message: "Failed to apply withdrawal",
                error: msg
            });
        }
    } catch (error) {
        console.log("error::", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
            error: "" + error.message
        });
    }
};

// Handle webhooks
async function depositWebhookHandler(req, res){
    return await handleDepositWebhook(req, res);
}

async function withdrawWebhookHandler(req, res) {
    return await handleWithdrawWebhook(req, res);
}

module.exports = {
    getCoinListHandler,
    getChainListHandler,
    getAppCoinAssetListHandler,
    getAppCoinAssetHandler,
    getOrCreateAppDepositAddressHandler,
    getAppDepositRecordListHandler,
    applyAppWithdrawToNetworkHandler,
    withdrawToDerivativeWalletHandler, 
    depositWebhookHandler, 
    withdrawWebhookHandler
};
