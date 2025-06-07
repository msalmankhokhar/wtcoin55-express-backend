const Cccpayment = require("../utils/ccpayment");
const { Transactions } = require("../models/transactions");
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

        // Optionally validate 'type' if CCPayment sends it
        // const { type } = req.body;
        // if (type !== "Deposit") {
        //     return res.status(400).json({ error: `Unexpected webhook type: ${type}` });
        // }

        console.log("------------------")
        console.log(req.body)
        console.log("------------------")

        const userId = ccpayment.extractMongoId(req.body.msg.referenceId);
        const recordId = req.body.msg.recordId;
        const status = req.body.msg.status;

        if (status !== "Success") {
            return res.status(200).json({ msg: "success" });
        }


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

        const { code, msg, data } = JSON.parse(result)

        const userDeposit = data.record;

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

        console.log("------------------")
        console.log(req.body)
        console.log("------------------")

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