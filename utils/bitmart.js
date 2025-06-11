const crypto = require('crypto');
const axios = require('axios');
const { Transactions } = require('../models/transactions');

/**
 * BitMart API Client Class
 * Handles deposit and withdrawal operations with BitMart exchange
 */
class BitMart {
    /**
     * Initialize BitMart API client
     * @param {string} accessKey - BitMart API access key
     * @param {string} secretKey - BitMart API secret key
     * @param {string} memo - BitMart API memo
     * @param {string} baseURL - BitMart API base URL (default: https://api-cloud-v2.bitmart.com)
     */
    constructor(accessKey, secretKey, memo, baseURL) {
        console.log("Access Key:", accessKey);
        console.log("Secret Key:", secretKey);
        console.log("Memo:", memo);
        console.log("Base URL:", baseURL);
        this.accessKey = accessKey;
        this.secretKey = secretKey;
        this.memo = memo;
        this.baseURL = baseURL;
    }

    /**
     * Generate HMAC signature for BitMart API authentication
     * @param {string} timestamp - Current timestamp in milliseconds
     * @param {string} method - HTTP method (GET, POST, etc.)
     * @param {string} requestPath - API endpoint path
     * @param {string} body - Request body (empty string for GET requests)
     * @returns {string} - HMAC SHA256 signature
     */
    _generateSignature(timestamp, method, requestPath, body = '') {
        const message = timestamp + '#' + this.memo + '#' + method + '#' + requestPath + '#' + body;
        return crypto.createHmac('sha256', this.secretKey).update(message).digest('hex');
    }

    /**
     * Get authentication headers for BitMart API requests
     * @param {string} method - HTTP method (GET, POST, etc.)
     * @param {string} requestPath - API endpoint path
     * @param {string} body - Request body (empty string for GET requests)
     * @returns {Object} - Headers object with authentication
     */
    _getHeaders(method, requestPath, body = '') {
        const timestamp = Date.now().toString();
        const signature = this._generateSignature(timestamp, method, requestPath, body);
        

        return method==="GET" ? {
            'X-BM-KEY': this.accessKey,
            'X-BM-SIGN': signature,
            'X-BM-TIMESTAMP': timestamp
        } : {
            'X-BM-KEY': this.accessKey,
            'X-BM-SIGN': signature,
            'X-BM-TIMESTAMP': timestamp,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Make authenticated request to BitMart API
     * @param {string} method - HTTP method (GET, POST, etc.)
     * @param {string} endpoint - API endpoint path
     * @param {Object} data - Request payload (optional)
     * @returns {Promise<Object>} - API response data
     */
    async _makeRequest(method, endpoint, data = null, isPrivate = true) {
        const requestPath = endpoint.split('?')[0]; // Remove query params for signature
        const body = data ? JSON.stringify(data) : '';
        
        const headers = isPrivate ? this._getHeaders(method, requestPath, body) : {};

        try {
            const config = {
                method: method,
                url: this.baseURL + endpoint,
                headers: headers,
                timeout: 30000 // 30 second timeout
            };

            // Only add data for non-GET requests
            if (method !== 'GET' && data) {
                config.data = data;
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.error("BitMart API Error:", error.response?.data || error.message);
            throw new Error(`BitMart API Error: ${error.response?.data?.message || error.message}`);
        }
    }


    // ==================== DEPOSIT METHODS ====================

    /**
     * Get deposit address for a specific currency
     * @param {string} currency - Currency symbol (e.g., "BTC", "ETH", "USDT")
     * @returns {Promise<Object>} - Deposit address information
     */
    async getDepositAddress(currency) {
        console.log(encodeURIComponent(currency));
        const endpoint = `/account/v1/deposit/address?currency=${encodeURIComponent(currency)}`;
        return await this._makeRequest('GET', endpoint);
    }

    /**
     * Get deposit history with optional filters
     * @param {string} currency - Currency symbol (optional)
     * @param {number} startTime - Start timestamp in milliseconds (optional)
     * @param {number} endTime - End timestamp in milliseconds (optional)
     * @param {number} limit - Number of records to return (default: 50, max: 100)
     * @returns {Promise<Object>} - Deposit history records
     */
    async getDepositHistory(currency = '', startTime = null, endTime = null, limit = 50) {
        let endpoint = `/account/v2/deposit-withdraw/history?operation_type=deposit&limit=${limit}`;
        
        if (currency) endpoint += `&currency=${currency}`;
        if (startTime) endpoint += `&start_time=${startTime}`;
        if (endTime) endpoint += `&end_time=${endTime}`;
        
        return await this._makeRequest('GET', endpoint);
    }

    /**
     * Get specific deposit record by ID
     * @param {string} depositId - Deposit transaction ID
     * @returns {Promise<Object>} - Deposit record details
     */
    async getDepositRecord(depositId) {
        const endpoint = `/account/v1/deposit-withdraw/detail?id=${depositId}`;
        return await this._makeRequest('GET', endpoint);
    }

    /**
     * Generate unique reference for deposit tracking
     * @param {string} userId - User identifier
     * @param {string} currency - Currency symbol
     * @returns {string} - Unique reference ID
     */
    generateDepositReference(userId, currency) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `DEP-${currency}-${userId}-${timestamp}-${random}`;
    }

    // ==================== WITHDRAWAL METHODS ====================

    /**
     * Submit withdrawal request
     * @param {string} currency - Currency symbol (e.g., "BTC", "ETH", "USDT")
     * @param {string} amount - Withdrawal amount
     * @param {string} destination - Withdrawal destination ("To Digital Address")
     * @param {string} address - Destination wallet address
     * @param {string} address_memo - Address memo/tag (optional, required for some currencies)
     * @returns {Promise<Object>} - Withdrawal submission response
     */
    async submitWithdrawal(currency, amount, destination, address, address_memo = '') {
        const endpoint = '/account/v1/withdraw/apply';
        const data = {
            currency: currency,
            amount: amount,
            destination: destination,
            address: address,
            address_memo: address_memo
        };
        
        return await this._makeRequest('POST', endpoint, data);
    }

    /**
     * Get withdrawal history with optional filters
     * @param {string} currency - Currency symbol (optional)
     * @param {number} startTime - Start timestamp in milliseconds (optional)
     * @param {number} endTime - End timestamp in milliseconds (optional)
     * @param {number} limit - Number of records to return (default: 50, max: 100)
     * @returns {Promise<Object>} - Withdrawal history records
     */
    async getWithdrawalHistory(currency = '', startTime = null, endTime = null, limit = 50) {
        let endpoint = `/account/v2/deposit-withdraw/history?operation_type=withdraw&limit=${limit}`;
        
        if (currency) endpoint += `&currency=${currency}`;
        if (startTime) endpoint += `&start_time=${startTime}`;
        if (endTime) endpoint += `&end_time=${endTime}`;
        
        return await this._makeRequest('GET', endpoint);
    }

    /**
     * Get specific withdrawal record by ID
     * @param {string} withdrawalId - Withdrawal transaction ID
     * @returns {Promise<Object>} - Withdrawal record details
     */
    async getWithdrawalRecord(withdrawalId) {
        const endpoint = `/account/v1/deposit-withdraw/detail?id=${withdrawalId}`;
        return await this._makeRequest('GET', endpoint);
    }

    /**
     * Get withdrawal quota information for a currency
     * @param {string} currency - Currency symbol (e.g., "BTC", "ETH", "USDT")
     * @returns {Promise<Object>} - Withdrawal limits and fees information
     */
    async getWithdrawalQuota(currency) {
        const endpoint = `/account/v1/withdraw/quota?currency=${currency}`;
        return await this._makeRequest('GET', endpoint);
    }

    /**
     * Cancel pending withdrawal request
     * @param {string} withdrawalId - Withdrawal transaction ID to cancel
     * @returns {Promise<Object>} - Cancellation response
     */
    async cancelWithdrawal(withdrawalId) {
        const endpoint = '/account/v1/withdraw/cancel';
        const data = {
            id: withdrawalId
        };
        
        return await this._makeRequest('POST', endpoint, data);
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Get account balance for all currencies
     * @returns {Promise<Object>} - Account balance information
     */
    async getAccountBalance() {
        const endpoint = '/account/v1/wallet';
        return await this._makeRequest('GET', endpoint);
    }

    /**
     * Get currencies information (deposit/withdrawal status, fees, etc.)
     * @returns {Promise<Object>} - Available currencies and their configurations
     */
    async getCurrencies() {
    try {
        const response = await axios({
            method: 'GET',
            url: 'https://api-cloud.bitmart.com/spot/v1/symbols/details',
            timeout: 5000  // 5 second timeout
        });
        return response.data;
    } catch (error) {
        console.log('Symbols endpoint failed:', error.message);
        return null;
    }
}

    /**
     * Check if a currency supports deposits
     * @param {string} currency - Currency symbol to check
     * @returns {Promise<boolean>} - True if deposits are enabled
     */
    async isDepositEnabled(currency) {
        try {
            const currencies = await this.getCurrencies();
            const currencyInfo = currencies.data.currencies.find(c => c.currency === currency);
            return currencyInfo ? currencyInfo.deposit_enabled : false;
        } catch (error) {
            console.error('Error checking deposit status:', error);
            return false;
        }
    }

    /**
     * Check if a currency supports withdrawals
     * @param {string} currency - Currency symbol to check
     * @returns {Promise<boolean>} - True if withdrawals are enabled
     */
    async isWithdrawalEnabled(currency) {
        try {
            const currencies = await this.getCurrencies();
            const currencyInfo = currencies.data.currencies.find(c => c.currency === currency);
            return currencyInfo ? currencyInfo.withdraw_enabled : false;
        } catch (error) {
            console.error('Error checking withdrawal status:', error);
            return false;
        }
    }

    // This is a public endpoint, no auth required
    async getAllTradingPairs() {
        const endpoint = '/spot/v1/symbols';
        try {
            const response = await this._makeRequest('GET', endpoint, null, false); // false = not private
            return response.data.symbols;
        } catch (error) {
            throw new Error(`Error fetching trading pairs: ${error.message}`);
        }
    }

    // Get all Crypo currency available on BitMart
    async getAllCurrencies() {
        try {
            const response = await axios({
                method: 'GET',
                url: 'https://api-cloud.bitmart.com/account/v1/currencies',
                timeout: 5000
            });

            const currencies = response.data.data?.currencies;
            if (!currencies || !Array.isArray(currencies)) {
                throw new Error("Invalid response format from currencies endpoint");
            }

            const filtered = currencies.filter(currency =>
                currency.deposit_enabled && currency.withdraw_enabled
            );

            return filtered;

        } catch (error) {
            console.log('Symbols endpoint failed:', error.message);
            return null;
        }
    }

    /**
     * Transfer funds from Spot wallet to Futures wallet
     * @param {string} currency - Currency symbol (e.g., "USDT")
     * @param {string} amount - Amount to transfer
     * @returns {Promise<Object>} - Transfer response
     */
    async SpotToFuturesTransfer(currency, amount) {
        const endpoint = '/account/v1/transfer-contract';
        const data = {
            currency: currency,
            amount: amount,
            type: 'spot_to_futures'
        };
        
        return await this._makeRequest('POST', endpoint, data);
    }

}

module.exports = BitMart;

// ==================== USAGE EXAMPLE ====================

/*
// Initialize BitMart client
const bitmart = new BitMart(
    'your_access_key',
    'your_secret_key', 
    'your_memo'
);

// Example: Get deposit address
async function example() {
    try {
        // Get USDT deposit address
        const depositAddress = await bitmart.getDepositAddress('USDT');
        console.log('Deposit Address:', depositAddress);
        
        // Generate unique reference for user deposit
        const reference = bitmart.generateDepositReference('user123', 'USDT');
        console.log('Deposit Reference:', reference);
        
        // Get deposit history
        const deposits = await bitmart.getDepositHistory('USDT', null, null, 10);
        console.log('Recent Deposits:', deposits);
        
        // Submit withdrawal
        const withdrawal = await bitmart.submitWithdrawal(
            'USDT',
            '100',
            'To Digital Address',
            '0x1234567890abcdef1234567890abcdef12345678'
        );
        console.log('Withdrawal Response:', withdrawal);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}
*/