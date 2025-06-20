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
                console.log("Response:", response);
                throw new Error(`BitMart API Error: ${response.data.message}`);
            }

            return response.data;
        } catch (error) {
            // console.log(error);
            console.error("BitMart API Error:", error.response?.data || error.message);
            throw new Error(`BitMart API Error: ${error}`);
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

    // /**
    //  * Transfer funds from Spot wallet to Futures wallet
    //  * @param {string} currency - Currency symbol (e.g., "USDT")
    //  * @param {string} amount - Amount to transfer
    //  * @returns {Promise<Object>} - Transfer response
    //  */
    // async SpotToFuturesTransfer(currency, amount) {
    //     try {
    //         const endpoint = '/account/v1/transfer-contract';
    //         const data = {
    //             currency: currency,
    //             amount: amount,
    //             type: 'spot_to_futures',
    //             recvWindow: 7000
    //         };
            
    //         const response =  await this._makeRequest('POST', endpoint, data);

    //         if (response.code === 1000) {
    //             console.log(`✅ Transfer Successful!`);
    //             console.log(`Transfer ID: ${response.data?.transfer_id || 'N/A'}`);
    //             return response;
    //         } else {
    //             console.log(`❌ Transfer Failed - Code: ${response.code}, Message: ${response.message}`);
    //             return response; // Return the response so we can see the actual error
    //         }

    //     } catch (error) {
    //         console.error(`❌ Transfer Exception:`, error);
    //         return {
    //             code: 4001,
    //             message: error.message,
    //             data: null,
    //             error: true
    //         };
    //     }
    // }

    // async FuturesToSpotTransfer(currency, amount) {
    //     const endpoint = '/account/v1/transfer-contract';
    //     const data = {
    //         currency: currency,
    //         amount: amount,
    //         type: 'futures_to_spot',
    //         recvWindow: 7000
    //     };
        
    //     return await this._makeRequestV2('POST', endpoint, data);
    // }


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
        try {
            const response =  await this._makeRequestV2('POST', endpoint, data);
            if (response.code === 1000) {
                return response;
            }
            console.log("repsonse: ", response);
            return {
                code: 4001,
                message: error.message,
                data: null,
                error: true
            }
        } catch (error) {
            console.log(`❌ Spot Order Exception:`, error);
            return {
                code: 4001,
                message: error.message,
                data: null,
                error: true
            }
        }

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
        console.log("Trying Query History");

        const response =  await this._makeRequestV2('POST', endpoint, data);
        if (response.code !== 1000) {
            console.log("Trying Query Open");
            const newData = {
                orderId: order_id,
                queryState: 'open'
            };
            return await this._makeRequestV2('GET', endpoint, newData);
        }
        return response;
    }
   
    async getSpotTrades(symbol, orderMode = 'spot', startTime = null, endTime = null, limit = 10) {
        const endpoint = `/spot/v4/query/trades`;

        // Prepare request payload
        const data = {
            symbol,
            orderMode,
            limit,
            recvWindow: 5000
        };

        // Include startTime and endTime if provided
        if (startTime) data.startTime = startTime;
        if (endTime) data.endTime = endTime;

        // Make POST request with JSON body
        return await this._makeRequestV2('POST', endpoint, data);
    }

    async submitFuturesOrder(symbol, side, type, leverage, open_type="isolated", quantity, price) {
        //"symbol":"ETHUSDT",
        // "client_order_id":"BM1234",
        // "side":4,
        // "mode":1,
        // "type":"limit",
        // "leverage":"1",
        // "open_type":"isolated",
        // "size":10,
        // "price":"2000"
        const endpoint = '/contract/private/submit-order';

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

        const data = {
            symbol: symbol,
            side: side,
            mode: 1,
            type: type,
            leverage: leverage,
            open_type: open_type,
            size: size,
            price: price
        };

        return await this._makeRequestV2('POST', endpoint, data);
    }

    /**
     * Submit Futures Plan Order (Handles all types: limit, market, take_profit, stop_loss)
     * @param {string} symbol - Trading pair (e.g., "ETHUSDT", "BTCUSDT")
     * @param {number} side - Order side (1-4, see documentation for hedge/oneway modes)
     * @param {string} type - Order type: "limit", "market", "take_profit", "stop_loss"
     * @param {string} leverage - Leverage amount (e.g., "1", "10", "50")
     * @param {string} open_type - Position type: "cross" or "isolated"
     * @param {number} size - Order size (Number of contracts)
     * @param {string} trigger_price - Trigger price for the plan order
     * @param {string} executive_price - Execution price (required for limit orders)
     * @param {number} price_way - Price direction: 1=long, 2=short
     * @param {number} price_type - Trigger price type: 1=last_price, 2=fair_price
     * @param {Object} options - Optional parameters for advanced features
     * @returns {Promise<Object>} - BitMart API response
     */
    async submitFuturesPlanOrder(symbol, side, type, leverage, open_type, size, trigger_price, executive_price, price_way, price_type, options = {}) {
        try {
            console.log(`Submitting futures plan order: ${type} ${side} ${size} ${symbol} at trigger: ${trigger_price}`);
            
            const endpoint = '/contract/private/submit-plan-order';
            
            // Validate required fields
            if (!symbol || !side || !leverage || !open_type || !size || !trigger_price || !price_way || !price_type) {
                throw new Error('Missing required fields: symbol, side, leverage, open_type, size, trigger_price, price_way, price_type');
            }
            
            // Validate side values (1-4)
            if (![1, 2, 3, 4].includes(parseInt(side))) {
                throw new Error('Invalid side value. Must be 1, 2, 3, or 4');
            }
            
            // Validate open_type
            if (!['cross', 'isolated'].includes(open_type)) {
                throw new Error('Invalid open_type. Must be "cross" or "isolated"');
            }
            
            // Validate price_way (1=long, 2=short)
            if (![1, 2].includes(parseInt(price_way))) {
                throw new Error('Invalid price_way. Must be 1 (long) or 2 (short)');
            }
            
            // Validate price_type (1=last_price, 2=fair_price)
            if (![1, 2].includes(parseInt(price_type))) {
                throw new Error('Invalid price_type. Must be 1 (last_price) or 2 (fair_price)');
            }
            
            // Base data object
            const data = {
                symbol: symbol,
                side: parseInt(side),
                leverage: leverage.toString(),
                open_type: open_type,
                size: parseInt(size),
                trigger_price: trigger_price.toString(),
                price_way: parseInt(price_way),
                price_type: parseInt(price_type)
            };
            
            // Handle order type specific requirements
            if (type === 'limit') {
                if (!executive_price) {
                    throw new Error('Limit plan orders require executive_price');
                }
                data.type = 'limit';
                data.executive_price = executive_price.toString();
                
            } else if (type === 'market') {
                data.type = 'market';
                // Market orders don't need executive_price
                
            } else if (type === 'take_profit') {
                if (!executive_price) {
                    throw new Error('Take profit orders require executive_price');
                }
                data.type = 'take_profit';
                data.executive_price = executive_price.toString();
                
            } else if (type === 'stop_loss') {
                if (!executive_price) {
                    throw new Error('Stop loss orders require executive_price');
                }
                data.type = 'stop_loss';
                data.executive_price = executive_price.toString();
                
            } else {
                throw new Error('Invalid order type. Must be: limit, market, take_profit, or stop_loss');
            }
            
            // Add optional mode (default: 1=GTC)
            data.mode = options.mode || 1;
            
            // Validate mode if provided
            if (options.mode && ![1, 2, 3, 4].includes(parseInt(options.mode))) {
                throw new Error('Invalid mode. Must be 1(GTC), 2(FOK), 3(IOC), or 4(Maker Only)');
            }
            
            // Add optional client_order_id
            if (options.client_order_id) {
                data.client_order_id = options.client_order_id.toString();
            }
            
            // Add optional plan_category for TP/SL
            if (options.plan_category) {
                if (![1, 2].includes(parseInt(options.plan_category))) {
                    throw new Error('Invalid plan_category. Must be 1 (TP/SL) or 2 (Position TP/SL)');
                }
                data.plan_category = parseInt(options.plan_category);
            }
            
            // Add optional preset Take Profit settings
            if (options.preset_take_profit_price) {
                data.preset_take_profit_price = options.preset_take_profit_price.toString();
                
                // Add TP price type if specified
                if (options.preset_take_profit_price_type) {
                    if (![1, 2].includes(parseInt(options.preset_take_profit_price_type))) {
                        throw new Error('Invalid preset_take_profit_price_type. Must be 1 (last_price) or 2 (fair_price)');
                    }
                    data.preset_take_profit_price_type = parseInt(options.preset_take_profit_price_type);
                } else {
                    data.preset_take_profit_price_type = 1; // Default to last_price
                }
            }
            
            // Add optional preset Stop Loss settings
            if (options.preset_stop_loss_price) {
                data.preset_stop_loss_price = options.preset_stop_loss_price.toString();
                
                // Add SL price type if specified
                if (options.preset_stop_loss_price_type) {
                    if (![1, 2].includes(parseInt(options.preset_stop_loss_price_type))) {
                        throw new Error('Invalid preset_stop_loss_price_type. Must be 1 (last_price) or 2 (fair_price)');
                    }
                    data.preset_stop_loss_price_type = parseInt(options.preset_stop_loss_price_type);
                } else {
                    data.preset_stop_loss_price_type = 1; // Default to last_price
                }
            }
            
            console.log('Plan order data:', JSON.stringify(data, null, 2));
            
            // Submit the order
            const response = await this._makeRequestV2('POST', endpoint, data);
            
            if (response.code === 1000) {
                console.log(`✅ Futures plan order submitted successfully!`);
                console.log(`Order ID: ${response.data?.order_id || 'N/A'}`);
                console.log(`Type: ${type}, Side: ${side}, Size: ${size}, Trigger: ${trigger_price}`);
                
                if (data.executive_price) {
                    console.log(`Execution Price: ${data.executive_price}`);
                }
                if (data.preset_take_profit_price) {
                    console.log(`Take Profit: ${data.preset_take_profit_price}`);
                }
                if (data.preset_stop_loss_price) {
                    console.log(`Stop Loss: ${data.preset_stop_loss_price}`);
                }
            } else {
                console.error(`❌ Plan order failed:`, response);
            }
            
            return response;
            
        } catch (error) {
            console.error('Error submitting futures plan order:', error);
            throw error;
        }
    }

    async getContractDetails(symbol) {
        const endpoint = '/contract/public/details'
        const param = `symbol=${symbol}`;

        return this._makeRequestV2('GET', endpoint+param);
    }

    /**
     * Get single order details
     * @param {string} symbol - Trading symbol (e.g., "ETHUSDT")
     * @param {string} orderId - BitMart order ID
     */
    async getContractOrder(symbol, orderId) {
        const params = {
            symbol: symbol,
            order_id: orderId
        };

        return await this._makeRequestV2('GET', `/contract/private/order?symbol=${symbol}&order_id=${orderId}`, params);
    }

    /**
     * Get order history (completed/cancelled orders)
     * @param {string} symbol - Optional symbol filter
     * @param {number} startTime - Optional start timestamp
     * @param {number} endTime - Optional end timestamp  
     * @param {number} limit - Max results (default 50)
     */
    async getContractOrderHistory(symbol = null, startTime = null, endTime = null, limit = 50) {
        const params = { limit };
        
        if (symbol) params.symbol = symbol;
        if (startTime) params.start_time = startTime;
        if (endTime) params.end_time = endTime;

        // Build query string
        const queryParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                queryParams.append(key, params[key]);
            }
        });

        return await this._makeRequestV2('GET', `/contract/private/order-history?${queryParams.toString()}`, params);
    }

    /**
     * Get current plan orders (active/pending plan orders)
     * @param {string} symbol - Optional symbol filter
     * @param {string} type - Optional type filter (market, limit, stop_loss, take_profit)
     * @param {number} limit - Max results (default 50)
     */
    async getCurrentPlanOrders(symbol = null, type = null, limit = 50) {
        const params = { limit };
        
        if (symbol) params.symbol = symbol;
        if (type) params.type = type;

        // Build query string
        const queryParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                queryParams.append(key, params[key]);
            }
        });

        return await this._makeRequestV2('GET', `/contract/private/current-plan-order?${queryParams.toString()}`, params);
    }

    /**
     * Get all open orders (regular orders, not plan orders)
     * @param {string} symbol - Optional symbol filter
     * @param {string} orderState - Optional state filter
     * @param {string} type - Optional type filter
     * @param {number} limit - Max results (default 50)
     */
    async getOpenOrders(symbol = null, orderState = null, type = null, limit = 50) {
        const params = { limit };
        
        if (symbol) params.symbol = symbol;
        if (orderState) params.order_state = orderState;
        if (type) params.type = type;

        // Build query string
        const queryParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                queryParams.append(key, params[key]);
            }
        });

        return await this._makeRequestV2('GET', `/contract/private/get-open-orders?${queryParams.toString()}`, params);
    }
}

module.exports = BitMart;

// ==================== USAGE EXAMPLE ====================