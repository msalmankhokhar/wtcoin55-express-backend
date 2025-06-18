const Ccpayment = require('../utils/ccpayment');
const BitMart = require('../utils/bitmart');
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

// Get the BitMart API variables
const { BITMART_API_KEY, BITMART_API_SECRET, BITMART_API_MEMO, BITMART_BASE_URL } = process.env;

// Create a new instance of BitMart API client
const bitmart = new BitMart(
    BITMART_API_KEY,
    BITMART_API_SECRET,
    BITMART_API_MEMO,
    BITMART_BASE_URL
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

        if (!['TRC20', 'TRC', 'TRX', 'ETH', 'ERC20', 'TRON', 'ERC'].includes(chain.toUpperCase())) {
            return res.status(400).json({ success: false, error: "Invalid chain" });
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


async function withdrawToTradeWalletHandler(req, res){
    try {
        const user = req.user; // Assuming user is attached to the request
        const { amount, destination, coinId, chain, memo="" } = req.body;
        let currency, newChain;
        let type;

        if (destination !== 'spots' && destination !== 'futures') {
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
        if (chain.toUpperCase() === 'TRC20') {
            // For TRX, we need to use the TRC20 chain
            newChain = 'TRX';
            currency = `${coinName.toUpperCase()}-${newChain.toUpperCase()}`;
        } else if (chain.toUpperCase() === 'BSC') {
            newChain = 'BSC_BNB';
            currency = `${coinName.toUpperCase()}-${newChain.toUpperCase()}`;
        } else if (chain.toUpperCase() === coinName.toUpperCase()) {
            currency = `${coinName.toUpperCase()}`;
        } else if (chain.toUpperCase() === 'AVAX') {
            newChain = 'AVAX_C';
            currency = `${coinName.toUpperCase()}-${newChain.toUpperCase()}`;
        } else if (chain.toUpperCase() === 'SOL' && coinName.toUpperCase() === 'USDC') {
            newChain = 'SPL';
            currency = `${coinName.toUpperCase()}-${newChain.toUpperCase()}`;

        } else {
            currency = `${coinName.toUpperCase()}-${chain.toUpperCase()}`;
        }
        
        const toAddress = await bitmart.getDepositAddress(currency);

        // console.log("toAddress::", toAddress);

        if (!toAddress.code || toAddress.code !== 1000) {
            console.log("Coin not supported:", currency);
            return res.status(400).json({ message: 'Coin is not supported' });
        }
        // console.log(toAddress.data);
        const address = toAddress.data.address;

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
        console.log("withdrawalDetails::", withdrawalDetails);
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
                status: 'processing',
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

// async function swapCoinsHnadler(req, res){
//     try {
//         let user = req.user;
//         const { coinIdIn, amountIn, coinIdOut } = req.body;
//         const orderId = `${user._id.toString()}${uuidv4()}`;

//         const hasCoinIn = await Balance.findOne({ user: user._id, coinId: coinIdIn });

//         if (!hasCoinIn) {
//             return res.status(400).json({
//                 status: false,
//                 message: "Insufficient balance",
//             });
//         }

//         if (hasCoinIn.balance < amountIn) {
//             return res.status(400).json({
//                 status: false,
//                 message: "Insufficient balance to swap" + hasCoinIn.coinName,
//             });
//         }

//         // Get coin information
//         const coinListResponse = await getCoinList();
//         const { code: coinListCode, msg: coinListMsg, data: coinListData } = JSON.parse(coinListResponse);

//         if (coinListCode !== 10000 || coinListMsg !== "success") {
//             return res.status(500).json({
//                 status: false,
//                 message: "Failed to retrieve coin information",
//             });
//         }

//         const coinOutInfo = coinListData.coins.find(coin => coin.coinId === coinIdOut);
//         const coinInInfo = coinListData.coins.find(coin => coin.coinId === coinIdIn);

//         if (!coinOutInfo || !coinInInfo) {
//             return res.status(400).json({
//                 status: false,
//                 message: "Invalid coin IDs",
//             });
//         }

//         // Call the swapCoins function from utils
//         const response = await swapCoins(orderId, coinIdIn, amountIn, coinIdOut);

//         // {
//         //      "code": 10000, 
//         //      "msg": "success", 
//         //      "data": 
//         //      { 
//         //         "recordId": "20250303182320248341967631716352", 
//         //         "orderId": "67c5963306b694669adcfd44ba9ade02-90c4-4fc1-ab81-960c48aa44eb", 
//         //         "coinIdIn": 1280, 
//         //         "coinIdOut": 1282, 
//         //         "amountOut": "0.9955520015992803", 
//         //         "amountIn": "1", 
//         //         "swapRate": "0.9955520015992803", 
//         //         "fee": "0.0999550202408916", 
//         //         "feeRate": "0.1004016064257028", 
//         //         "netAmountOut": "0.8955969813583887" 
//         //     } }

//         // Parse the response
//         const { code, msg, data } = JSON.parse(response);
//         if (code === 10000 && msg === "success") {
//             // Deduct the amount from coinIn balance
//             await updateBalance(
//                 user._id,
//                 coinIdIn,
//                 coinInInfo.symbol,
//                 -amountIn,
//                 data.recordId,
//                 coinInInfo.logoUrl
//             );

//             console.log("coinOutInfo::", coinOutInfo);

//             // Add the netAmountOut to coinOut balance
//             await updateBlc_NTR(
//                 user._id,
//                 coinIdOut,
//                 coinOutInfo.symbol,
//                 parseFloat(data.netAmountOut),
//                 coinOutInfo.logoUrl
//             );

//             return res.status(200).json({
//                 status: true,
//                 message: "Coins swapped successfully",
//                 data: data
//             });
//         } else {
//             return res.status(500).json({
//                 status: false,
//                 message: "Failed to swap coins",
//                 error: msg
//             });
//         }
//     } catch (error) {
//         console.log("error::", error);
//         return res.status(500).json({
//             status: false,
//             message: "Internal server error",
//             error: error.message
//         });
//     }
// }

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
    withdrawToTradeWalletHandler, 
    depositWebhookHandler, 
    withdrawWebhookHandler
};
