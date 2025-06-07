const crypto = require('crypto');
const https = require('https');
const { Transactions } = require('../models/transactions');
const { MainBalance } = require('../models/balance');


/**
 * Ccpayment API Client Class
 * Handles deposit and withdrawal operations with Cccpayment exchange
 */
class CcPayment {
    /**
     * Initialize Cccpayment API client
     * @param {string} appSecret - Ccpayment API secret key
     * @param {string} appId - Ccpayment API identifier
     * @param {string} baseURL - Ccpayment API base URL (default: https://ccpayment.com/ccpayment/v2)
     */
    constructor(appSecret, appId, baseURL) {
        this.appSecret = appSecret;
        this.appId = appId;
        this.baseURL = baseURL;
    }

    /**
     * Generate a signature for the request
     * @param {Object} params - Request parameters
     * @returns {string} - Generated signature
     */
    generateSignature(params) {
        const sortedKeys = Object.keys(params).sort();
        const sortedParams = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
        return crypto.createHmac('sha256', this.appSecret).update(sortedParams).digest('hex');
    }

    /**
    * Makes a request to CCPayment API with the given path and args
    * @param {string} path - API endpoint path
    * @param {object|string} args - Request body arguments
    * @param {number} retryCount - Number of retry attempts for timeout errors
    * @returns {Promise<string>} - Resolves with API response
    */
    _makeRequest(path, args = "", retryCount = 3) {
        return new Promise((resolve, reject) => {
            const timestamp = Math.floor(Date.now() / 1000);
            let signText = this.appId + timestamp;
            if (args) {
                signText += args;
            }

            const sign = crypto
                .createHmac("sha256", this.appSecret)
                .update(signText)
                .digest("hex");

            const options = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Appid": this.appId,
                    "Sign": sign,
                    "Timestamp": timestamp.toString(),
                },
                timeout: 15000,
            };

            const req = https.request(path, options, (res) => {
                let respData = "";

                res.on("data", (chunk) => {
                    respData += chunk;
                });

                res.on("end", () => {
                    resolve(respData);
                });
            });

            req.on("error", (err) => {
                if (isTimeoutError(err) && retryCount > 0) {
                    setTimeout(() => {
                        resolve(this._makeRequest(path, args, retryCount - 1));
                    }, 200);
                } else {
                    reject(err);
                }
            });

            req.write(args);
            req.end();
        });
    }

    /**
     * Function to check if a withdrawal address is valid for a given chain
     * @param {string} chain - Blockchain network (e.g. "POLYGON")
     * @param {string} address - Wallet address to validate
     * @returns {Promise<string>} - Resolves with API response
     */
    checkWithdrawalAddressValidity(chain, address) {
        const args = JSON.stringify({
            chain: chain,
            address: address
        });
        return this._makeRequest("https://ccpayment.com/ccpayment/v2/checkWithdrawalAddressValidity", args);
    }

    /**
     * Function to get or create an app deposit address from CCPayment API
     * @param {string} chain - Blockchain network (e.g. "POLYGON")
     * @returns {Promise<string>} - Resolves with API response
     */
    async getOrCreateAppDepositAddress(coinId, referenceId) {
        console.log(coinId)
        const args = JSON.stringify({
            referenceId: referenceId,
            chain: coinId,
        });
        const res = await this._makeRequest("https://ccpayment.com/ccpayment/v2/getOrCreateAppDepositAddress", args);
        return res;
    }

    /**
     * Function to get app deposit record from CCPayment API
     * @param {string} recordId - ID of the deposit record to retrieve
     * @returns {Promise<string>} - Resolves with API response
     */
    async getAppDepositRecord(recordId) {
        const args = JSON.stringify({
            recordId: recordId,
        });
        const res = await this._makeRequest("https://ccpayment.com/ccpayment/v2/getAppDepositRecord", args);
        return res;
    }

    /**
     * Function to get app deposit record list from CCPayment API
     * @returns {Promise<string>} - Resolves with API response
     */
    async getAppDepositRecordList() {
        const res = await this._makeRequest("https://ccpayment.com/ccpayment/v2/getAppDepositRecordList");
        return res;
    }


    /**
     * Function to apply for app withdrawal to network
     * @param {object} withdrawalDetails - Withdrawal details including coinId, address, amount, etc
     * @returns {Promise<string>} - Resolves with API response
     */
    async applyAppWithdrawToNetwork(withdrawalDetails) {
        const args = JSON.stringify({
            coinId: withdrawalDetails.coinId,
            address: withdrawalDetails.address,
            orderId: withdrawalDetails.orderId,
            chain: withdrawalDetails.chain,
            amount: withdrawalDetails.amount,
            merchantPayNetworkFee: withdrawalDetails.merchantPayNetworkFee,
            memo: withdrawalDetails.memo
        });
        return await this._makeRequest("https://ccpayment.com/ccpayment/v2/applyAppWithdrawToNetwork", args);
    }

    /**
     * Function to get withdrawal record details
     * @param {string} orderId - Order ID of the withdrawal
     * @returns {Promise<string>} - Resolves with API response
     */
    async getWithdrawRecord(orderId) {
        const args = JSON.stringify({ orderId });
        const res = await this._makeRequest("https://ccpayment.com/ccpayment/v2/getAppWithdrawRecord", args)
            .then((response) => {
                return response;
            })
            .catch((error) => {
                console.error("Error querying withdrawal record:", error);
                throw error;
            });
        return res;
    }

    /**
     * Function to fetch coin list from CCPayment API
     * @returns {Promise<string>} - Resolves with API response
     */
    async getCoinList() {
        return await this._makeRequest("https://ccpayment.com/ccpayment/v2/getCoinList");
    }

    /**
     * Function to get chain list from CCPayment API
     * @param {string[]} chains - Array of chain names (e.g. ["ETH", "POLYGON"])
     * @returns {Promise<string>} - Resolves with API response
     */
    async getChainList(chains) {
        const args = JSON.stringify({
            chains: chains
        });
        return this._makeRequest("https://ccpayment.com/ccpayment/v2/getChainList", args);
    }

    /**
     * Function to get app coin asset list from CCPayment API
     * @returns {Promise<string>} - Resolves with API response
     */
    async getAppCoinAssetList() {
        return this._makeRequest("https://ccpayment.com/ccpayment/v2/getAppCoinAssetList");
    }

    /**
     * Function to get app coin asset details from CCPayment API
     * @param {number} coinId - ID of the coin to get details for
     * @returns {Promise<string>} - Resolves with API response
     */
    async getAppCoinAsset(coinId) {
        const args = JSON.stringify({
            coinId: coinId
        });
        return this._makeRequest("https://ccpayment.com/ccpayment/v2/getAppCoinAsset", args);
    }

    /**
     * Function to get app deposit record from CCPayment API
     * @param {string} recordId - ID of the deposit record to retrieve
     * @returns {Promise<string>} - Resolves with API response
     */
    async  getAppDepositRecord(recordId) {
        const args = JSON.stringify({
            recordId: recordId,
        });
        const res = await makeRequest("https://ccpayment.com/ccpayment/v2/getAppDepositRecord", args);
        return res;
    }

    /**
     * Extract the first 24 characters from a given string.
     * @param {String} str - The input string containing MongoDB ID and UUID.
     * @returns {String} - The first 24 characters (MongoDB ID).
     */
    extractMongoId(str) {
        if (typeof str !== 'string' || str.length < 24) {
            throw new Error("Invalid input string");
        }
        return str.substring(0, 24);
    }

    /**
     * Update the balance for a user and coin.
     * @param {ObjectId} userId - The user's ID.
     * @param {Number} coinId - The coin's ID.
     * @param {String} coinName - The coin's name.
     * @param {Number} amount - The amount to add or subtract from the balance.
     * @param {String} logoUrl - The URL of the coin's logo.
     * @param {String} recordId - The record ID of the transaction.
     * @returns {Promise<Object>} - The updated balance document.
     */
    async updateBalance(userId, coinId, coinName, amount, recordId, logoUrl) {
        try {
            // Check if the transaction history already exists
            const existingHistory = await Transactions.findOne({ user: userId, recordId });

            if (existingHistory) {
                // console.log("Transaction already processed for this record.");
                return false; // Return false if the transaction has already been processed
            }

            // Update the balance
            const balance = await MainBalance.findOneAndUpdate(
                { user: userId, coinId: coinId },
                { $inc: { balance: amount }, coinName: coinName, updatedAt: new Date(), logoUrl: logoUrl },
                { new: true, upsert: true }
            );

            // Record the transaction in history
            const balanceTxHistory = new Transactions({
                user: userId,
                coinId,
                amount,
                recordId
            });

            await balanceTxHistory.save();

            return balance;
        } catch (error) {
            console.error("Error updating balance:", error);
            throw error;
        }
    }
};


module.exports = CcPayment;