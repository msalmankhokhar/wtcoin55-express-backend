const Cccpayment = require("../utils/ccpayment");
const { Transactions } = require("../models/transactions");
const { SpotBalance } = require("../models/spot-balance");
const { FuturesBalance } = require('../models/futures-balance');
const crypto = require("crypto");
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

        // Optionally validate 'type' if CCPayment sends it
        // const { type } = req.rawBody;
        // if (type !== "Deposit") {
        //     return res.status(400).json({ error: `Unexpected webhook type: ${type}` });
        // }

        console.log("------------------")
        console.log(req.body);
        console.log("------------------")

        if (req.body.type === "ActivateWebhookURL") {
            return res.status(200).json({ msg: "success" });
        }

        const userId = ccpayment.extractMongoId(req.body.msg.referenceId);
        const recordId = req.body.msg.recordId;
        const status = req.body.msg.status;

        if (status !== "Success") {
            return res.status(200).json({ msg: "success" });
        }


        console.log("User ID:", userId);
        console.log("Record ID:", recordId);
        const result = await ccpayment.getAppDepositRecord(recordId)


        // sample response from the result-----------------

        // { 
        // "code": 10000, 
        // "msg": "success", 
        // "data": 
        // { "record": 
        //  { "recordId": "20250321040839254649861445558272", 
        //     "referenceId": "67c34bb3c10deb8afb0daf920ed4dcea-c8a6-40dc-a943-ef3931d7720e", 
        //     "coinId": 1280, 
        //     "coinSymbol": "USDT", 
        //     "chain": "TRX", 
        //     "contract": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", 
        //     "coinUSDPrice": "1", 
        //     "fromAddress": "TEkPS823QiLFgb4GeK1h1P77SpSzvdYqzA", 
        //     "toAddress": "TDTFjqSUmGKHBVPo12J4ozCVhcgRUdNQRW", 
        //     "toMemo": "", 
        //     "amount": "6.97841", 
        //     "serviceFee": "0.034893", 
        //     "txId": "2d8b1dc99157b93cf8f835128851a0b9f78144f769db47fcc3c39e73cf2775de", 
        //     "txIndex": 200000, "status": "Success", "arrivedAt": 1742530119, "isFlaggedAsRisky": false } } }

        console.log("Result:", result);
        const { code, msg, data } = JSON.parse(result)

        console.log(msg);
        const userDeposit = msg;

        const coinId = userDeposit.coinId;
        const coinName = userDeposit.coinSymbol;
        const amount = userDeposit.amount;

        await ccpayment.updateBalance(userId, coinId, coinName, amount, recordId);


        // Respond to the webhook
        return res.staus(200).json({ msg: "success" });
    } catch (error) {
        console.log("error::", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
        });
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

        const transactions = await Transactions.findOneAndUpdate(
            { recordId: recordId, orderId: orderId },
            { status: msg.status },
            { new: true }
        );

        if (!transactions) {
            console.log("Transaction not found for recordId:", recordId, "and orderId:", orderId);
            // return res.status(404).json({ error: "Transaction not found" });
        }
        if (transactions.type === "deposit_to_spots") {
            // Update the funded wallet
                const spotBalance = await SpotBalance.findOne({ user: transactions.userId, coinId: transactions.coinId });
                if (spotBalance) {
                    spotBalance.balance += transactions.amount;
                    await spotBalance.save();
                } else {
                    // If spot balance does not exist, create a new one
                    const newSpotBalance = new SpotBalance({
                        user: transactions.userId,
                        coinId: transactions.coinId,
                        balance: transactions.amount,
                        currency: transactions.currency,
                        chain: transactions.chain,
                        memo: transactions.memo || "",
                        updatedAt: new Date.now()
                    });
                    await newSpotBalance.save();
                    type = "deposit_to_spots";
                }
            // return res.status(200).json({ msg: "success" });
        } else if (transactions.type === "deposit_to_futures") {
            const futuresBalance = await FuturesBalance.findOne({ user: transactions.userId, coinId: transactions.coinId });
                if (futuresBalance) {
                    futuresBalance.balance += transactions.amount;
                    await futuresBalance.save();
                } else {
                    // If spot balance does not exist, create a new one
                    const newFuturesBalance = new FuturesBalance({
                        user: transactions.userId,
                        coinId: transactions.coinId,
                        balance: transactions.amount,
                        currency: transactions.currency,
                        chain: transactions.chain,
                        memo: transactions.memo || "",
                        updatedAt: new Date.now()
                    });
                    await newFuturesBalance.save();
                    type = "deposit_to_futures";
                }
        }

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