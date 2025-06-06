const Ccpayment = require('../utils/ccpayment');
const { v4: uuidv4 } = require('uuid');
const { Address } = require('../models/address');
const { MainBalance } = require('../models/balance');
const { SpotBalance } = require('../models/spot-balance');
const { FuturesBalance } = require('../models/futures-balance');
const { Transactions } = require('../models/transactions');
const crypto = require('crypto');

const ccpayment = new Ccpayment(
    process.env.CCPAYMENT_APP_SECRET,
    process.env.CCPAYMENT_APP_ID,
    process.env.CCPAYMENT_BASE_URL || 'https://ccpayment.com/ccpayment/v2'
);

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


// Route handler for getting app deposit address
async function getOrCreateAppDepositAddressHandler(req, res) {
    try {
        const { coinId } = req.body;
        const referecneId = req.user._id;
        if (!coinId || !referecneId) {
            return res.status(400).json({ success: false, error: 'coinId and cwalletUser are required' });
        }
        const address = await ccpayment.getOrCreateAppDepositAddress(coinId, referecneId);
        res.json({ success: true, data: JSON.parse(address) });
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
                status: 'Processing',
                type: 'withdrawal'
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
            error: error.message
        });
    }
};


async function withdrawToDerivativeWalletHandler(req, res){
    try {
        const user = req.user; // Assuming user is attached to the request
        const { amount, memo, destination } = req.body;

        if (destination !== 'spots' || destination !== 'futures') {
            return res.status(400).json({
                status: false,
                message: "Invalid destination. Only 'spots' or 'futures' are allowed.",
            });
        }
        const coinId = "COIN_ID_USDC";
        const address = destination === 'spots' ? process.env.SPOTS_DEPOSIT_ADDRESS : process.env.BITMART_FUTURES_DEPOSIT_ADDRESS;
        const chain = "USDC-ETH";


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

            // Update the funded wallet
            if (destination === 'spots') {
                const spotBalance = await SpotBalance.findOne({ user: user._id, coinId });
                if (spotBalance) {
                    spotBalance.balance += amount;
                    await spotBalance.save();
                }
            } else if (destination === 'futures') {
                const futuresBalance = await FuturesBalance.findOne({ user: user._id, coinId });
                if (futuresBalance) {
                    futuresBalance.balance += amount;
                    await futuresBalance.save();
                }
            }

            // Record the withdrawal in history
            const withdrawalHistory = new Transactions({
                user: user._id,
                coinId,
                amount,
                address,
                chain,
                memo,
                orderId,
                status: 'Processing',
                type: 'derivatives_withdrawal'
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
            error: error.message
        });
    }
};

module.exports = {
    getCoinListHandler,
    getOrCreateAppDepositAddressHandler,
    getChainListHandler,
    getAppCoinAssetListHandler,
    getAppCoinAssetHandler,
    getOrCreateAppDepositAddressHandler,
    getAppDepositRecordListHandler,
    applyAppWithdrawToNetworkHandler,
    withdrawToDerivativeWalletHandler
};
