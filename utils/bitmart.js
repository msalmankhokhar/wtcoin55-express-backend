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
    _generateSignature(timestamp, method, requestPath, body = '', v2 = false) {
        if (v2) {
            const queryString = method === 'GET' ? (requestPath.split('?')[1] || '') : '';
            const messageContent = method === 'GET'
                ? queryString
                : JSON.stringify(body, Object.keys(body).sort());

            // const newBody = JSON.stringify(body, Object.keys(body).sort());
            console.log(this.secretKey);
            const message = timestamp + '#' + this.memo + '#' + queryString + body;
            return crypto.createHmac('sha256', this.secretKey).update(message).digest('hex');
        } else {
            // v1 signature format: timestamp#memo#method#requestPath#body
            // Make sure requestPath excludes query params for signature
            const cleanPath = requestPath.split('?')[0];
            const message = `${timestamp}#${this.memo}#${method}#${cleanPath}#${body}`;
            return crypto.createHmac('sha256', this.secretKey).update(message).digest('hex');
        }
    }

    /**
     * Get authentication headers for BitMart API requests
     * @param {string} method - HTTP method (GET, POST, etc.)
     * @param {string} requestPath - API endpoint path
     * @param {string} body - Request body (empty string for GET requests)
     * @param {boolean} v2 - Whether to use v2 signature format (default: false)
     * @returns {Object} - Headers object with authentication
     */
    _getHeaders(method, requestPath, body = '', v2 = false) {
        const timestamp = Date.now().toString();
        const signature = this._generateSignature(timestamp, method, requestPath, body, v2);

        const headers = {
            'X-BM-KEY': this.accessKey,
            'X-BM-SIGN': signature,
            'X-BM-TIMESTAMP': timestamp
        };

        if (method !== "GET") {
            headers['Content-Type'] = 'application/json';
        }

        return headers;
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
            console.log("Using URL:", config.url);

            // Only add data for non-GET requests
            if (method !== 'GET' && data) {
                config.data = data;
            }

            const response = await axios(config);

            
            if (response.data.code !== 1000) {
                throw new Error(`BitMart API Error: ${response.data.message}`);
            }

            return response.data;
        } catch (error) {
            console.error("BitMart API Error:", error.response?.data || error.message);
            throw new Error(`BitMart API Error: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Make authenticated request to BitMart API (v2)
     * @param {string} method - HTTP method (GET, POST, etc.)
     * @param {string} endpoint - API endpoint path
     * @param {Object} [data=null] - Request payload (optional)
     * @returns {Promise<Object>} - API response data
     */
    async _makeRequestV2(method, endpoint, data = null) {
        const requestPath = endpoint.split('?')[0];
        const body = data ? JSON.stringify(data) : '';

        const headers = this._getHeaders(method, requestPath, body, true);

        try {
            const config = {
                method,
                url: `https://api-cloud-v2.bitmart.com${endpoint}`,
                headers,
                timeout: 30000
            };

            if (method !== 'GET' && data) {
                config.data = data;
            }

            const response = await axios(config);

            if (response.data.code !== 1000) {
                throw new Error(`BitMart API Error: ${response.data.message}`);
            }

            return response.data;
        } catch (error) {
            console.log(error);
            const errorMessage = error.response?.data?.message || error.message;
            throw new Error(`BitMart API Error: ${errorMessage}`);
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
        if (response.data && response.data.code === 1000 && response.data.data && response.data.data.symbols) {
            console.log(`Successfully fetched ${response.data.data.symbols.length} symbols`);
            return response.data.data.symbols;  // ← Return ONLY the symbols array
        } else {
            console.error('BitMart API error:', response.data);
            return [];
        }
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
            type: 'spot_to_futures',
            recvWindow: 7000
        };
        
        return await this._makeRequestV2('POST', endpoint, data);
    }

    async FuturesToSpotTransfer(currency, amount) {
        const endpoint = '/account/v1/transfer-contract';
        const data = {
            currency: currency,
            amount: amount,
            type: 'futures_to_spot',
            recvWindow: 7000
        };
        
        return await this._makeRequestV2('POST', endpoint, data);
    }


    // Enhanced submitSpotOrder with better order tracking
    async submitSpotOrder(symbol, side, type, quantity = null, price = null, notional = null) {
        const endpoint = '/spot/v2/submit_order';
        const data = {
            symbol: symbol,
            side: side,
            type: type
        };

        if (type === 'limit') {
            if (!price || !quantity) {
                throw new Error("Limit order requires both price and quantity.");
            }
            data.price = price;
            data.size = quantity; // BitMart uses 'size' not 'quantity'
        } else if (type === 'market') {
            if (side === 'buy') {
                if (!notional) {
                    throw new Error("Market buy order requires 'notional' (amount in quote currency).");
                }
                data.notional = notional;
            } else if (side === 'sell') {
                if (!quantity) {
                    throw new Error("Market sell order requires 'quantity'.");
                }
                data.size = quantity;
            }
        } else {
            throw new Error("Invalid order type. Must be 'limit' or 'market'.");
        }

        return await this._makeRequestV2('POST', endpoint, data);
    }

    // Get order trades to see execution details
    async getOrderTrades(orderId) {
        const endpoint = '/spot/v4/query/order-trades';
        const data = {
            orderId: orderId
        };
        
        return await this._makeRequestV2('POST', endpoint, data);
    }

    // Get user's current fee rates
    async getUserFeeRates() {
        const endpoint = '/spot/v1/user_fee';
        return await this._makeRequestV2('GET', endpoint, {});
    }

    // Get specific trading pair fee rates
    async getTradingPairFeeRate(symbol) {
        const endpoint = '/spot/v1/trade_fee';
        return await this._makeRequestV2('GET', endpoint, { symbol });
    }

    async withdrawFromSpotWallet(currency, amount, destination, address, memo = '') {
        const endpoint = '/account/v1/withdraw/apply';
        const data = {
            currency: currency,
            amount: amount,
            destination: destination,
            address: address,
            address_memo: memo
        };

        return await this._makeRequest('POST', endpoint, data);
    }


    async withdrawFromFuturesWallet(currency, amount, destination, address, memo = '') {
        // Note: BitMart does not support direct withdrawals from Futures wallet to external addresses.
        // Transfer from Futures to Spot wallet first, then withdraw from Spot wallet.
        // First transfer from Futures to Spot wallet
        await this.FuturesToSpotTransfer(currency, amount);
        console.log(`Transferred ${amount} ${currency} from Futures to Spot wallet.`);
        // Now we can withdraw from Spot wallet
        // Then withdraw from Spot wallet
        const endpoint = '/account/v1/withdraw/apply';
        const data = {
            currency: currency,
            amount: amount,
            destination: destination,
            address: address,
            address_memo: memo
        };

        return await this._makeRequest('POST', endpoint, data);
    }

    async getSpotOrder(order_id) {
        const endpoint = `/spot/v4/query/order`;
        const data = {
            orderId: order_id,
            queryState: 'history'
        };

        return await this._makeRequest('GET', endpoint, data);
    }

    async getSpotTrades(symbol, orderMode = 'spot', startTime = null, endTime = null, limit = 10) {
        const endpoint = `/spot/v4/query/trades`;

        // Prepare request payload
        const data = {
            symbol,
            orderMode,       // 'spot' or 'margin'
            limit,
            recvWindow: 5000
        };

        // Include startTime and endTime if provided
        if (startTime) data.startTime = startTime;
        if (endTime) data.endTime = endTime;

        // Make POST request with JSON body
        return await this._makeRequest('POST', endpoint, data);
    }



}

module.exports = BitMart;

// ==================== USAGE EXAMPLE ====================