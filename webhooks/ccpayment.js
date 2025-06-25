const Cccpayment = require("../utils/ccpayment");
const { Transactions } = require("../models/transactions");
const { SpotBalance } = require("../models/spot-balance");
const { FuturesBalance } = require('../models/futures-balance');
const { AdminWallet } = require("../models/adminWallet");
const { WithdrawalRequest } = require("../models/withdrawal");
const crypto = require("crypto");
const { Users } = require("../models/users");
require("dotenv").config();

const ccpayment = new Cccpayment(
    process.env.CCPAYMENT_APP_SECRET,
    process.env.CCPAYMENT_APP_ID,
    process.env.CCPAYMENT_BASE_URL
);

async function handleDepositWebhook(req, res) {
    try {
        console.log("CCPayment Deposit Webhook received");
        console.log("------------------")
        // console.log(req.body);
        console.log(req.header);
        console.log("------------------")
        console.log(req.headers);
        const appId = process.env.CCPAYMENT_APP_ID;
        const appSecret = process.env.CCPAYMENT_APP_SECRET;

        const requestAppId = req.header('Appid');
        const requestSign = req.header('Sign');
        const requestTimestamp = req.header('Timestamp');

        // Validate AppId
        if (requestAppId !== appId) {
            return res.status(401).json({ error: "Invalid AppId" });
        }

        // Validate timestamp (within 5 minutes)
        const timestamp = parseInt(requestTimestamp, 10);
        if (isNaN(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) {
            return res.status(401).json({ error: "Invalid or expired timestamp" });
        }

        // Generate signature and verify
        let signText = `${requestAppId}${timestamp}`;
        if (Object.keys(req.body).length > 0) {
            signText += JSON.stringify(req.body);
        }

        const hmac = crypto.createHmac('sha256', appSecret);
        hmac.update(signText);
        const expectedSign = hmac.digest('hex');

        if (requestSign !== expectedSign) {
            console.log("Invalid signature:", requestSign, expectedSign);
            console.log("Request Body:", req.body);
            return res.status(401).json({ error: "Invalid signature" });
        }


        console.log("------------------");
        console.log(req.body);
        console.log("------------------");

        if (req.body.type === "ActivateWebhookURL") {
            return res.status(200).json({ msg: "success" });
        }

        const userId = ccpayment.extractMongoId(req.body.msg.referenceId);
        // console.log(userId);
        const recordId = req.body.msg.recordId;
        const status = req.body.msg.status;

        let dest = req.body.msg.referenceId.match(/spot/)?.[0] || null;
        dest = !dest ? req.body.msg.referenceId.match(/futures/)?.[0] || null : dest;

        console.log(dest);

        if (status !== "Success") {
            return res.status(200).json({ msg: "success" });
        }

        if (dest && dest === 'spot' || dest === 'futures') {
            // Find the transaction
            // await Transactions.updateOne({ referenceId: req.body.msg.referenceId }, { $set: { status: "completed" } });
        }
        // await Transactions.updateOne({ referenceId: req.body.msg.referenceId }, { $set: { status: "completed" } });

        console.log("User ID:", userId);
        console.log("Record ID:", recordId);
        const result = await ccpayment.getAppDepositRecord(recordId);

        console.log("Result:", result);
        const { code, msg, data } = JSON.parse(result);

        const userDeposit = data.record;

        const coinId = userDeposit.coinId;
        const coinName = userDeposit.coinSymbol;
        const userAmount = parseFloat(userDeposit.amount);
        const referenceId = userDeposit.referenceId;
        console.log("Amount:", userAmount);

        // Check if this is a mass deposit
        if (referenceId && referenceId.startsWith('MASS_DEPOSIT_')) {
            console.log("🔄 Processing mass deposit...");

            // Handle mass deposit
            await handleMassDeposit(userDeposit);

            // Create pending transaction record
            const transaction = new Transactions({
                user: userId,
                coinId,
                currency: coinName,
                amount: userAmount,
                address: data.address,
                chain,
                orderId: referenceId,
                recordId: data.recordId,
                status: 'completed',
                type: 'mass_deposit',
                webhookStatus: 'completed',
                updatedAt: new Date()
            });
            await transaction.save();


            console.log("✅ Mass deposit processed successfully");
            return res.status(200).json({ msg: "success" });
        }

        // Regular user deposit processing
        console.log("🔄 Processing regular user deposit...");

        // Check if this is the user first deposit 
        const user = await Users.findById({ _id: userId });
        if (!user.firstDeposit) {
            const bonusPercentage = 0.05;
            const referrerBonusPercentage = 0.10;

            // Calculate bonuses
            const userBonus = userAmount * bonusPercentage;
            const referrerBonus = userAmount * referrerBonusPercentage;

            // Add bonus to user's deposit
            await ccpayment.updateBalance(userId, coinId, coinName, amount=userAmount+userBonus, recordId);

            // Add bonus to referrer, if exists
            if (user.referBy && user.referBy !== "") {
                // Get the user who referred this user
                const referredUser = await Users.findOne({ referCode: user.referBy });
                if (referredUser) {
                    await ccpayment.updateBalance(referredUser._id, coinId, coinName, amount=referrerBonus, recordId);
                    await Transactions.create({
                        user: referredUser._id,
                        coinId: coinId,
                        coinName: coinName,
                        amount: referrerBonus,
                        orderId: `referrer_bonus_${referenceId}`,
                        recordId: `referrer_bonus_${recordId}`,
                        type: "referrer_bonus",
                        status: "completed",
                        webhookStatus: "completed",
                        updatedAt: new Date()
                    });
                }
            }

            // Mark as first deposit true
            user.firstDeposit = true;
            await user.save();
        } else {
            await ccpayment.updateBalance(userId, coinId, coinName, userAmount, recordId);
        }

        // Update transaction status
        const userTransaction = await Transactions({
            user: userId,
            coinId: coinId,
            currency: coinName,
            amount: userAmount,
            orderId: referenceId,
            recordId: recordId,
            status: 'completed',
            type: 'deposit',
            webhookStatus: 'completed',
            updatedAt: new Date()
        });
        await userTransaction.save();

        // Respond to the webhook
        return res.status(200).json({ msg: "success" });
    } catch (error) {
        console.log("error::", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
        });
    }
}

/**
 * Handle mass deposit webhook
 * @param {Object} userDeposit - Deposit record from CCPayment
 */
async function handleMassDeposit(userDeposit) {
    try {
        const coinId = userDeposit.coinId;
        const coinName = userDeposit.coinSymbol;
        const amount = parseFloat(userDeposit.amount);
        const chain = userDeposit.chain;
        const referenceId = userDeposit.referenceId;

        console.log(`💰 Processing mass deposit: ${amount} ${coinName} (${chain})`);

        // Find or create admin wallet entry
        let adminWallet = await AdminWallet.findOne({ coinId: coinId.toString(), chain });
        if (!adminWallet) {
            adminWallet = new AdminWallet({
                coinId: coinId.toString(),
                coinName,
                currency: coinName,
                chain,
                balance: 0
            });
        }

        // Add the deposit amount to admin wallet
        adminWallet.balance += amount;
        adminWallet.updatedAt = new Date();
        await adminWallet.save();

        console.log(`✅ Admin wallet updated: ${adminWallet.balance} ${coinName} (${chain})`);

        // Update transaction status
        await Transactions.updateOne(
            { orderId: referenceId },
            { 
                $set: { 
                    status: "completed", 
                    webhookStatus: "completed",
                    amount: amount,
                    updatedAt: new Date()
                } 
            }
        );

        console.log(`✅ Mass deposit transaction completed: ${referenceId}`);

    } catch (error) {
        console.error('❌ Error processing mass deposit:', error);
        throw error;
    }
}

async function handleWithdrawWebhook(req, res) {
    try {
        const appId = process.env.CCPAYMENT_APP_ID;
        const appSecret = process.env.CCPAYMENT_APP_SECRET;

        const requestAppId = req.header('Appid');
        const requestSign = req.header('Sign');
        const requestTimestamp = req.header('Timestamp');

        // Validate AppId
        if (requestAppId !== appId) {
            return res.status(401).json({ error: "Invalid AppId" });
        }

        // Validate timestamp (within 5 minutes)
        const timestamp = parseInt(requestTimestamp, 10);
        if (isNaN(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) {
            return res.status(401).json({ error: "Invalid or expired timestamp" });
        }

        // Generate signature and verify
        let signText = `${requestAppId}${timestamp}`;
        if (Object.keys(req.body).length > 0) {
            signText += JSON.stringify(req.body);
        }

        const hmac = crypto.createHmac('sha256', appSecret);
        hmac.update(signText);
        const expectedSign = hmac.digest('hex');

        if (requestSign !== expectedSign) {
            return res.status(401).json({ error: "Invalid signature" });
        }

        const { msg } = req.body;
        const recordId = msg.recordId;
        const orderId = msg.orderId;

        const transactions = await Transactions.findOne(
            { recordId: recordId, orderId: orderId }
        );

        const withdrawalRequest = await WithdrawalRequest.findOne({ orderId: orderId });
        if (!withdrawalRequest) {
            console.log("Withdrawal request not found for orderId:", orderId);
            return res.status(404).json({ error: "Withdrawal request not found" });
        }

        if (!transactions) {
            console.log("Transaction not found for recordId:", recordId, "and orderId:", orderId);
            // return res.status(404).json({ error: "Transaction not found" });
            return res.status(200).json({ msg: "success" });
        }
        if (transactions.type === "deposit_to_spots" || transactions.type === "deposit_to_futures") {
            console.log("Transaction is a deposit to spots or futures, skipping withdrawal processing.");
            await Transactions.updateOne(
                { recordId: recordId, orderId: orderId },
                { $set: { webhookStatus: "completed", updatedAt: Date.now() } }
            );

            await SpotBalance.updateOne(
                { user: transactions.user, coinId: transactions.coinId, coinName: transactions.coinName },
                { $inc: { balance: transactions.amount } },
                { upsert: true }
            );
            return res.status(200).json({ msg: "success" });
        }

        await Transactions.updateOne(
            { recordId: recordId, orderId: orderId },
            { $set: { status: "completed", webhookStatus: "completed", updatedAt: Date.now() } }
        );

        await WithdrawalRequest.updateOne(
            { orderId: orderId },
            { $set: { status: "completed", updatedAt: Date.now() } }
        );

        // Respond to the webhook
        res.json({ msg: "success" });
    } catch (error) {
        console.log("error::", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
        });
    }
}

module.exports = { handleDepositWebhook, handleWithdrawWebhook };