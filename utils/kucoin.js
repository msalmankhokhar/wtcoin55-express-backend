const crypto = require('crypto');
const axios = require('axios');
const { Transactions } = require('../models/transactions');

/**
 * KuCoin API Client Class
 * Handles spot trading, futures trading, deposits, withdrawals, and transfers
 */
class KuCoin {
    /**
     * Initialize KuCoin API client
     * @param {string} apiKey - KuCoin API key
     * @param {string} apiSecret - KuCoin API secret
     * @param {string} passphrase - KuCoin API passphrase
     * @param {string} environment - 'sandbox' or 'live' (default: 'live')
     */
    constructor(apiKey, apiSecret, passphrase, environment = 'live') {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.passphrase = passphrase;
        this.environment = environment;
        
        // Set base URLs based on environment
        this.baseURL = environment === 'sandbox' 
            ? 'https://openapi-sandbox.kucoin.com' 
            : 'https://api.kucoin.com';
        
        this.futuresBaseURL = environment === 'sandbox'
            ? 'https://api-sandbox-futures.kucoin.com'
            : 'https://api-futures.kucoin.com';
            
        console.log("KuCoin API Key:", apiKey);
        console.log("Environment:", environment);
        console.log("Spot Base URL:", this.baseURL);
        console.log("Futures Base URL:", this.futuresBaseURL);
    }

    /**
     * Generate signature for KuCoin API authentication
     * @param {string} timestamp - Current timestamp in milliseconds
     * @param {string} method - HTTP method (GET, POST, DELETE)
     * @param {string} requestPath - API endpoint path
     * @param {string} body - Request body (empty string for GET requests)
     * @returns {string} - Base64 encoded HMAC SHA256 signature
     */
    _generateSignature(timestamp, method, requestPath, body = '') {
        const what = timestamp + method + requestPath + body;
        return crypto.createHmac('sha256', this.apiSecret).update(what).digest('base64');
    }

    /**
     * Generate encrypted passphrase for KuCoin API
     * @returns {string} - Base64 encoded encrypted passphrase
     */
    _generatePassphrase() {
        return crypto.createHmac('sha256', this.apiSecret).update(this.passphrase).digest('base64');
    }

    /**
     * Get authentication headers for KuCoin API requests
     * @param {string} method - HTTP method (GET, POST, DELETE)
     * @param {string} requestPath - API endpoint path
     * @param {string} body - Request body (empty string for GET requests)
     * @returns {Object} - Headers object with authentication
     */
    _getHeaders(method, requestPath, body = '') {
        const timestamp = Date.now().toString();
        const signature = this._generateSignature(timestamp, method, requestPath, body);
        const passphrase = this._generatePassphrase();

        return {
            'KC-API-KEY': this.apiKey,
            'KC-API-SIGN': signature,
            'KC-API-TIMESTAMP': timestamp,
            'KC-API-PASSPHRASE': passphrase,
            'KC-API-KEY-VERSION': '2',
            'Content-Type': 'application/json'
        };
    }

    /**
     * Make authenticated request to KuCoin API
     * @param {string} method - HTTP method (GET, POST, DELETE)
     * @param {string} endpoint - API endpoint path
     * @param {Object} data - Request payload (optional)
     * @param {boolean} isFutures - Whether this is a futures API call (default: false)
     * @param {boolean} isPrivate - Whether authentication is required (default: true)
     * @returns {Promise<Object>} - API response data
     */
    async _makeRequest(method, endpoint, data = null, isFutures = false, isPrivate = true) {
        const baseURL = isFutures ? this.futuresBaseURL : this.baseURL;
        const body = data ? JSON.stringify(data) : '';
        
        const headers = isPrivate ? this._getHeaders(method, endpoint, body) : {
            'Content-Type': 'application/json'
        };

        try {
            const config = {
                method: method,
                url: baseURL + endpoint,
                headers: headers,
                timeout: 30000
            };

            if (method !== 'GET' && data) {
                config.data = data;
            }

            console.log("Making request to:", config.url);
            const response = await axios(config);

            // KuCoin uses "code" field for success/error status
            if (response.data.code && response.data.code !== "200000") {
                throw new Error(`KuCoin API Error: ${response.data.msg || response.data.message}`);
            }

            return response.data;
        } catch (error) {
            console.log(error);
            console.log('----------------');
            console.error("KuCoin API Error:", error.response?.data || error.message);
            throw new Error(`KuCoin API Error: ${error.response?.data?.msg || error.message}`);
        }
    }

    // ==================== ACCOUNT & BALANCE METHODS ====================

    /**
     * Get account balance for all currencies (spot account)
     * @returns {Promise<Object>} - Account balance information
     */
    async getAccountBalance() {
        const endpoint = '/api/v1/accounts';
        return await this._makeRequest('GET', endpoint);
    }

    /**
     * Get specific account balance by currency and account type
     * @param {string} currency - Currency symbol (e.g., "BTC", "USDT")
     * @param {string} type - Account type: "main", "trade", "margin"
     * @returns {Promise<Object>} - Specific account balance
     */
    async getAccountBalanceByCurrency(currency, type = 'trade') {
        const endpoint = `/api/v1/accounts?currency=${currency}&type=${type}`;
        return await this._makeRequest('GET', endpoint);
    }

    /**
     * Get futures account balance
     * @returns {Promise<Object>} - Futures account balance
     */
    async getFuturesAccountBalance() {
        const endpoint = '/api/v1/account-overview';
        return await this._makeRequest('GET', endpoint, null, true);
    }

    // ==================== SPOT TRADING METHODS ====================

    /**
     * Get all trading symbols (spot)
     * @returns {Promise<Object>} - Available trading symbols
     */
    async getAllTradingPairs() {
        const endpoint = '/api/v2/symbols';
        return await this._makeRequest('GET', endpoint, null, false, false);
    }

    /**
     * Get all currencies information
     * @returns {Promise<Object>} - Available currencies with deposit/withdrawal status
     */
    async getAllCurrencies() {
        const endpoint = '/api/v3/currencies';
        return await this._makeRequest('GET', endpoint, null, false, false);
    }

    /**
     * Submit spot order (BitMart compatible interface)
     * @param {string} client_order_id - Client order ID (optional)
     * @param {string} symbol - Trading symbol (e.g., "BTC-USDT")
     * @param {string} side - Order side: "buy" or "sell"
     * @param {string} type - Order type: "market" or "limit"
     * @param {string} quantity - Order size (for limit orders or market sell)
     * @param {string} price - Order price (required for limit orders)
     * @param {string} notional - Funds for market buy orders
     * @returns {Promise<Object>} - Order response
     */
    async submitSpotOrder(client_order_id, symbol, side, type, quantity = null, price = null, notional = null) {
        const endpoint = '/api/v1/orders';
        const data = {
            symbol: symbol,
            side: side,
            type: type
        };

        if (client_order_id) {
            data.clientOid = client_order_id;
        }

        if (type === 'limit') {
            if (!price || !quantity) {
                throw new Error("Limit order requires both price and quantity.");
            }
            data.price = price;
            data.size = quantity;
        } else if (type === 'market') {
            if (side === 'buy') {
                if (!notional) {
                    throw new Error("Market buy order requires 'notional' (quote currency amount).");
                }
                data.funds = notional;
            } else if (side === 'sell') {
                if (!quantity) {
                    throw new Error("Market sell order requires 'quantity' (base currency amount).");
                }
                data.size = quantity;
            }
        }

        return await this._makeRequest('POST', endpoint, data);
    }

    /**
     * Get spot order details by order ID
     * @param {string} orderId - Order ID
     * @returns {Promise<Object>} - Order details
     */
    async getSpotOrder(orderId) {
        const endpoint = `/api/v1/orders/${orderId}`;
        return await this._makeRequest('GET', endpoint);
    }

    /**
     * Get spot trading history/fills (BitMart compatible interface)
     * @param {string} symbol - Trading symbol (optional)
     * @param {string} orderMode - Order mode (for compatibility, ignored)
     * @param {number} startTime - Start time timestamp (optional)
     * @param {number} endTime - End time timestamp (optional)
     * @param {number} limit - Number of records (default: 10, max: 500)
     * @returns {Promise<Object>} - Trading history
     */
    async getSpotTrades(symbol, orderMode = 'spot', startTime = null, endTime = null, limit = 10) {
        let endpoint = `/api/v1/fills?pageSize=${limit}`;
        
        if (symbol) endpoint += `&symbol=${symbol}`;
        if (startTime) endpoint += `&startAt=${startTime}`;
        if (endTime) endpoint += `&endAt=${endTime}`;
        
        return await this._makeRequest('GET', endpoint);
    }

    /**
     * Cancel spot order by order ID
     * @param {string} orderId - Order ID to cancel
     * @returns {Promise<Object>} - Cancellation response
     */
    async cancelSpotOrder(orderId) {
        const endpoint = `/api/v1/orders/${orderId}`;
        return await this._makeRequest('DELETE', endpoint);
    }

    // ==================== FUTURES TRADING METHODS ====================

    /**
     * Get all futures contracts
     * @returns {Promise<Object>} - Available futures contracts
     */
    async getFuturesContracts() {
        const endpoint = '/api/v1/contracts/active';
        return await this._makeRequest('GET', endpoint, null, true, false);
    }

    /**
     * Submit futures order
     * @param {string} clientOid - Client order ID (optional)
     * @param {string} symbol - Contract symbol (e.g., "XBTUSDTM")
     * @param {string} side - Order side: "buy" or "sell"
     * @param {string} type - Order type: "market" or "limit"
     * @param {string} size - Order size (number of contracts)
     * @param {string} price - Order price (required for limit orders)
     * @param {number} leverage - Leverage (1-100)
     * @returns {Promise<Object>} - Order response
     */
    async submitFuturesOrder(clientOid, symbol, side, type, size, price = null, leverage = 1) {
        const endpoint = '/api/v1/orders';
        const data = {
            symbol: symbol,
            side: side,
            type: type,
            size: size,
            leverage: leverage
        };

        if (clientOid) {
            data.clientOid = clientOid;
        }

        if (type === 'limit') {
            if (!price) {
                throw new Error("Limit order requires price.");
            }
            data.price = price;
        }

        return await this._makeRequest('POST', endpoint, data, true);
    }

    /**
     * Get futures order details
     * @param {string} orderId - Order ID
     * @returns {Promise<Object>} - Order details
     */
    async getFuturesOrder(orderId) {
        const endpoint = `/api/v1/orders/${orderId}`;
        return await this._makeRequest('GET', endpoint, null, true);
    }

    /**
     * Get futures trading history/fills
     * @param {string} symbol - Contract symbol (optional)
     * @param {string} orderId - Order ID (optional)
     * @param {number} startAt - Start time timestamp (optional)
     * @param {number} endAt - End time timestamp (optional)
     * @param {number} currentPage - Page number (default: 1)
     * @param {number} pageSize - Page size (default: 50)
     * @returns {Promise<Object>} - Trading history
     */
    async getFuturesTrades(symbol = null, orderId = null, startAt = null, endAt = null, currentPage = 1, pageSize = 50) {
        let endpoint = `/api/v1/fills?currentPage=${currentPage}&pageSize=${pageSize}`;
        
        if (symbol) endpoint += `&symbol=${symbol}`;
        if (orderId) endpoint += `&orderId=${orderId}`;
        if (startAt) endpoint += `&startAt=${startAt}`;
        if (endAt) endpoint += `&endAt=${endAt}`;
        
        return await this._makeRequest('GET', endpoint, null, true);
    }

    /**
     * Get futures positions
     * @param {string} symbol - Contract symbol (optional)
     * @returns {Promise<Object>} - Current positions
     */
    async getFuturesPositions(symbol = null) {
        const endpoint = symbol ? `/api/v1/positions?symbol=${symbol}` : '/api/v1/positions';
        return await this._makeRequest('GET', endpoint, null, true);
    }

    // ==================== DEPOSIT METHODS ====================

    /**
     * Get deposit address for a specific currency
     * @param {string} currency - Currency symbol (e.g., "BTC", "ETH", "USDT")
     * @param {string} chain - Chain name (optional, for multi-chain currencies)
     * @returns {Promise<Object>} - Deposit address information
     */
    async getDepositAddress(currency, chain = null) {
        let endpoint = `/api/v2/deposit-addresses?currency=${currency}`;
        if (chain) {
            endpoint += `&chain=${chain}`;
        }
        return await this._makeRequest('GET', endpoint);
    }

    /**
     * Get deposit history (BitMart compatible interface)
     * @param {string} currency - Currency symbol (optional)
     * @param {number} startTime - Start timestamp in milliseconds (optional)
     * @param {number} endTime - End timestamp in milliseconds (optional)
     * @param {number} limit - Number of records to return (default: 50)
     * @returns {Promise<Object>} - Deposit history records
     */
    async getDepositHistory(currency = '', startTime = null, endTime = null, limit = 50) {
        let endpoint = `/api/v1/deposits?pageSize=${limit}`;
        
        if (currency) endpoint += `&currency=${currency}`;
        if (startTime) endpoint += `&startAt=${startTime}`;
        if (endTime) endpoint += `&endAt=${endTime}`;
        
        return await this._makeRequest('GET', endpoint);
    }

    /**
     * Get specific deposit record by ID
     * @param {string} depositId - Deposit transaction ID
     * @returns {Promise<Object>} - Deposit record details
     */
    async getDepositRecord(depositId) {
        const endpoint = `/api/v1/deposits/${depositId}`;
        return await this._makeRequest('GET', endpoint);
    }

    // ==================== WITHDRAWAL METHODS ====================

    /**
     * Submit withdrawal request (BitMart compatible interface)
     * @param {string} currency - Currency symbol (e.g., "BTC", "ETH", "USDT")
     * @param {string} amount - Withdrawal amount
     * @param {string} destination - Withdrawal destination (for compatibility)
     * @param {string} address - Destination wallet address
     * @param {string} address_memo - Address memo/tag (optional)
     * @returns {Promise<Object>} - Withdrawal response
     */
    async submitWithdrawal(currency, amount, destination, address, address_memo = '') {
        const endpoint = '/api/v1/withdrawals';
        const data = {
            currency: currency,
            address: address,
            amount: amount,
            isInner: false
        };

        if (address_memo) data.memo = address_memo;

        return await this._makeRequest('POST', endpoint, data);
    }

    /**
     * Get withdrawal history (BitMart compatible interface)
     * @param {string} currency - Currency symbol (optional)
     * @param {number} startTime - Start timestamp in milliseconds (optional)
     * @param {number} endTime - End timestamp in milliseconds (optional)
     * @param {number} limit - Number of records to return (default: 50)
     * @returns {Promise<Object>} - Withdrawal history records
     */
    async getWithdrawalHistory(currency = '', startTime = null, endTime = null, limit = 50) {
        let endpoint = `/api/v1/withdrawals?pageSize=${limit}`;
        
        if (currency) endpoint += `&currency=${currency}`;
        if (startTime) endpoint += `&startAt=${startTime}`;
        if (endTime) endpoint += `&endAt=${endTime}`;
        
        return await this._makeRequest('GET', endpoint);
    }

    /**
     * Get specific withdrawal record by ID
     * @param {string} withdrawalId - Withdrawal transaction ID
     * @returns {Promise<Object>} - Withdrawal record details
     */
    async getWithdrawalRecord(withdrawalId) {
        const endpoint = `/api/v1/withdrawals/${withdrawalId}`;
        return await this._makeRequest('GET', endpoint);
    }

    /**
     * Get withdrawal quotas for a currency
     * @param {string} currency - Currency symbol
     * @param {string} chain - Chain name (optional)
     * @returns {Promise<Object>} - Withdrawal limits and fees
     */
    async getWithdrawalQuota(currency, chain = null) {
        let endpoint = `/api/v1/withdrawals/quotas?currency=${currency}`;
        if (chain) {
            endpoint += `&chain=${chain}`;
        }
        return await this._makeRequest('GET', endpoint);
    }

    /**
     * Cancel withdrawal request
     * @param {string} withdrawalId - Withdrawal ID to cancel
     * @returns {Promise<Object>} - Cancellation response
     */
    async cancelWithdrawal(withdrawalId) {
        const endpoint = `/api/v1/withdrawals/${withdrawalId}`;
        return await this._makeRequest('DELETE', endpoint);
    }

    // ==================== TRANSFER METHODS ====================

    /**
     * Transfer funds between different account types
     * @param {string} currency - Currency symbol
     * @param {string} amount - Transfer amount
     * @param {string} from - Source account: "main", "trade", "margin", "futures"
     * @param {string} to - Destination account: "main", "trade", "margin", "futures"
     * @param {string} clientOid - Client order ID (optional)
     * @returns {Promise<Object>} - Transfer response
     */
    async transferFunds(currency, amount, from, to, clientOid = null) {
        const endpoint = '/api/v2/accounts/inner-transfer';
        const data = {
            currency: currency,
            amount: amount,
            from: from,
            to: to
        };

        if (clientOid) {
            data.clientOid = clientOid;
        }

        return await this._makeRequest('POST', endpoint, data);
    }

    /**
     * Transfer from spot to futures account (BitMart compatible interface)
     * @param {string} currency - Currency symbol (e.g., "USDT")
     * @param {string} amount - Amount to transfer
     * @returns {Promise<Object>} - Transfer response
     */
    async SpotToFuturesTransfer(currency, amount) {
        return await this.transferFunds(currency, amount, 'trade', 'futures');
    }

    /**
     * Transfer from futures to spot account (BitMart compatible interface)
     * @param {string} currency - Currency symbol (e.g., "USDT")
     * @param {string} amount - Amount to transfer
     * @returns {Promise<Object>} - Transfer response
     */
    async FuturesToSpotTransfer(currency, amount) {
        return await this.transferFunds(currency, amount, 'futures', 'trade');
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Generate unique reference for deposit tracking (BitMart compatible)
     * @param {string} userId - User identifier
     * @param {string} currency - Currency symbol
     * @returns {string} - Unique reference ID
     */
    generateDepositReference(userId, currency) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `DEP-${currency}-${userId}-${timestamp}-${random}`;
    }

    /**
     * Check if a currency supports deposits
     * @param {string} currency - Currency symbol to check
     * @returns {Promise<boolean>} - True if deposits are enabled
     */
    async isDepositEnabled(currency) {
        try {
            const currencies = await this.getAllCurrencies();
            const currencyInfo = currencies.data.find(c => c.currency === currency);
            return currencyInfo ? currencyInfo.isDepositEnabled : false;
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
            const currencies = await this.getAllCurrencies();
            const currencyInfo = currencies.data.find(c => c.currency === currency);
            return currencyInfo ? currencyInfo.isWithdrawEnabled : false;
        } catch (error) {
            console.error('Error checking withdrawal status:', error);
            return false;
        }
    }

    /**
     * Get currencies information (BitMart compatible interface)
     * @returns {Promise<Object>} - Available currencies and their configurations
     */
    async getCurrencies() {
        try {
            const response = await this.getAllCurrencies();
            return {
                data: {
                    currencies: response.data.map(currency => ({
                        currency: currency.currency,
                        name: currency.fullName,
                        deposit_enabled: currency.isDepositEnabled,
                        withdraw_enabled: currency.isWithdrawEnabled,
                        network: currency.chains?.map(chain => chain.chainName).join(',') || ''
                    }))
                }
            };
        } catch (error) {
            console.log('Currencies endpoint failed:', error.message);
            return null;
        }
    }

    /**
     * Get server time
     * @returns {Promise<Object>} - Server timestamp
     */
    async getServerTime() {
        const endpoint = '/api/v1/timestamp';
        return await this._makeRequest('GET', endpoint, null, false, false);
    }

    /**
     * Get service status
     * @returns {Promise<Object>} - Service status information
     */
    async getServiceStatus() {
        const endpoint = '/api/v1/status';
        return await this._makeRequest('GET', endpoint, null, false, false);
    }

    // ==================== WRAPPER METHODS FOR COMPATIBILITY ====================

    /**
     * Withdraw from spot wallet (BitMart compatible interface)
     * @param {string} currency - Currency symbol
     * @param {string} amount - Withdrawal amount
     * @param {string} destination - Destination (for compatibility)
     * @param {string} address - Withdrawal address
     * @param {string} memo - Address memo
     * @returns {Promise<Object>} - Withdrawal response
     */
    async withdrawFromSpotWallet(currency, amount, destination, address, memo = '') {
        return await this.submitWithdrawal(currency, amount, destination, address, memo);
    }

    /**
     * Withdraw from futures wallet (transfers to spot first, then withdraws)
     * @param {string} currency - Currency symbol
     * @param {string} amount - Withdrawal amount
     * @param {string} destination - Destination (for compatibility)
     * @param {string} address - Withdrawal address
     * @param {string} memo - Address memo
     * @returns {Promise<Object>} - Withdrawal response
     */
    async withdrawFromFuturesWallet(currency, amount, destination, address, memo = '') {
        // First transfer from futures to spot
        await this.FuturesToSpotTransfer(currency, amount);
        console.log(`Transferred ${amount} ${currency} from Futures to Spot wallet.`);
        
        // Then withdraw from spot wallet
        return await this.submitWithdrawal(currency, amount, destination, address, memo);
    }
}

module.exports = KuCoin;