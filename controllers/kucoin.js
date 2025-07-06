const KuCoin = require('../utils/kucoin');
const CCpayment = require('../utils/ccpayment');
const { SpotBalance } = require('../models/spot-balance');
const { FuturesBalance } = require('../models/futures-balance');
const { SpotOrderHistory } = require('../models/spot-order');
const { Transactions } = require('../models/transactions');
const { v4: uuidv4 } = require('uuid');

// Get KuCoin API variables from environment
const { KUCOIN_API_KEY, KUCOIN_API_SECRET, KUCOIN_PASSPHRASE, KUCOIN_ENVIRONMENT } = process.env;

// Create KuCoin API client instance
const kucoin = new KuCoin(
    KUCOIN_API_KEY,
    KUCOIN_API_SECRET,
    KUCOIN_PASSPHRASE,
    KUCOIN_ENVIRONMENT || 'live'
);

console.log('KuCoin client initialized:', kucoin);

// CCPayment configuration
const { CCPAYMENT_APP_SECRET, CCPAYMENT_APP_ID, CCPAYMENT_BASE_URL } = process.env;
const ccpayment = new CCpayment(
    CCPAYMENT_APP_SECRET,
    CCPAYMENT_APP_ID,
    CCPAYMENT_BASE_URL
);

// ==================== MARKET DATA CONTROLLERS ====================

/**
 * Get all trading pairs available on KuCoin spot market
 * Usage: GET /api/kucoin/trading-pairs
 * When to use: When you need to display available trading pairs to users
 */
async function getTradingPairs(req, res) {
    try {
        const response = await kucoin.getAllTradingPairs();
        const pairs = response.data || [];
        res.status(200).json(pairs);
    } catch (error) {
        console.error('Error fetching trading pairs:', error);
        res.status(500).json({ error: 'Failed to fetch trading pairs' });
    }
}

/**
 * Get all currencies with pagination
 * Usage: GET /api/kucoin/currencies?page=1&limit=20
 * When to use: When displaying available currencies for deposits/withdrawals
 */
async function getAllCurrency(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    try {
        const response = await kucoin.getAllCurrencies();
        const currencies = response.data || [];
        
        // Filter for enabled currencies only
        const enabledCurrencies = currencies.filter(currency => 
            currency.isDepositEnabled || currency.isWithdrawEnabled
        );
        
        // Apply pagination
        const offset = (page - 1) * limit;
        const paginatedCurrencies = enabledCurrencies
            .slice(offset, offset + limit)
            .map(currency => ({
                currency: currency.currency,
                name: currency.fullName,
                chains: currency.chains || [],
                isDepositEnabled: currency.isDepositEnabled,
                isWithdrawEnabled: currency.isWithdrawEnabled,
                precision: currency.precision
            }));
        
        const meta = {
            totalCount: enabledCurrencies.length,
            currentPage: page,
            totalPages: Math.ceil(enabledCurrencies.length / limit),
            prev: page > 1 ? `/api/kucoin/currencies?page=${page - 1}&limit=${limit}` : null,
            next: page < Math.ceil(enabledCurrencies.length / limit) ? `/api/kucoin/currencies?page=${page + 1}&limit=${limit}` : null
        };
        
        return res.status(200).json({ data: paginatedCurrencies, meta });
    } catch (error) {
        console.error('Error fetching all currencies:', error);
        res.status(500).json({ error: 'Failed to fetch all currencies' });
    }
}

/**
 * Get deposit address for a specific currency
 * Usage: GET /api/kucoin/deposit-address?currency=BTC&chain=BTC
 * When to use: When users want to deposit funds to their trading account
 */
async function getDepositAddress(req, res) {
    const { currency, chain } = req.query;
    
    if (!currency) {
        return res.status(400).json({ error: 'Currency parameter is required' });
    }
    
    try {
        const address = await kucoin.getDepositAddress(currency, chain);
        res.status(200).json(address);
    } catch (error) {
        console.error('Error fetching deposit address:', error);
        res.status(500).json({ error: 'Failed to fetch deposit address' });
    }
}

// ==================== WALLET BALANCE CONTROLLERS ====================

/**
 * Get spot wallet balance for user
 * Usage: GET /api/kucoin/spot-balance or GET /api/kucoin/spot-balance/:coinId
 * When to use: To display user's spot trading balances
 */
async function getSpotWalletBalance(req, res) {
    try {
        const user = req.user;
        const coinId = req.params.coinId || "";
        let balance;

        if (coinId !== "") {
            balance = await SpotBalance.findOne({ user: user._id, coinId });
        } else {
            balance = await SpotBalance.find({ user: user._id });
        }
        res.status(200).json(balance);
    } catch (error) {
        console.error('Error fetching spot balance:', error);
        res.status(500).json({ error: 'Failed to fetch spot balance' });
    }
}

/**
 * Get futures wallet balance for user
 * Usage: GET /api/kucoin/futures-balance or GET /api/kucoin/futures-balance/:coinId
 * When to use: To display user's futures trading balances
 */
async function getFuturesWalletBalance(req, res) {
    try {
        const user = req.user;
        const coinId = req.params.coinId || "";
        let balance;

        if (coinId !== "") {
            balance = await FuturesBalance.findOne({ user: user._id, coinId });
        } else {
            balance = await FuturesBalance.find({ user: user._id });
        }
        res.status(200).json(balance);
    } catch (error) {
        console.error('Error fetching futures balance:', error);
        res.status(500).json({ error: 'Failed to fetch futures balance' });
    }
}

/**
 * Get real-time account balance from KuCoin API
 * Usage: GET /api/kucoin/account-balance?type=trade&currency=USDT
 * When to use: To get live balance data directly from KuCoin
 */
async function getAccountBalance(req, res) {
    try {
        const { type, currency } = req.query;
        let balance;
        
        if (currency && type) {
            balance = await kucoin.getAccountBalanceByCurrency(currency, type);
        } else {
            balance = await kucoin.getAccountBalance();
        }
        
        res.status(200).json(balance);
    } catch (error) {
        console.error('Error fetching account balance:', error);
        res.status(500).json({ error: 'Failed to fetch account balance' });
    }
}

/**
 * Get real-time futures account balance from KuCoin API
 * Usage: GET /api/kucoin/futures-account-balance
 * When to use: To get live futures balance directly from KuCoin
 */
async function getFuturesAccountBalance(req, res) {
    try {
        const balance = await kucoin.getFuturesAccountBalance();
        res.status(200).json(balance);
    } catch (error) {
        console.error('Error fetching futures account balance:', error);
        res.status(500).json({ error: 'Failed to fetch futures account balance' });
    }
}

// ==================== TRANSFER CONTROLLERS ====================

/**
 * Transfer funds from spot to futures account
 * Usage: POST /api/kucoin/fund-futures { currency: "USDT", amount: "100" }
 * When to use: When users want to move funds from spot to futures for trading
 */
async function fundFuturesAccount(req, res) {
    try {
        const user = req.user;
        const { currency, amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid funding amount' });
        }

        if (!currency) {
            return res.status(400).json({ error: 'Currency is required' });
        }

        // Check if user has sufficient balance in spot wallet
        const spotBalance = await SpotBalance.findOne({ user: user._id, coinId: currency });
        if (!spotBalance || spotBalance.balance < parseFloat(amount)) {
            return res.status(400).json({ error: 'Insufficient balance in spot wallet' });
        }

        const result = await kucoin.SpotToFuturesTransfer(currency, amount);
        
        // Update database balances
        await SpotBalance.findOneAndUpdate(
            { user: user._id, coinId: currency },
            { $inc: { balance: -parseFloat(amount) } }
        );
        
        await FuturesBalance.findOneAndUpdate(
            { user: user._id, coinId: currency },
            { $inc: { balance: parseFloat(amount) } },
            { upsert: true }
        );

        res.status(200).json(result);
    } catch (error) {
        console.error('Error funding futures account:', error);
        res.status(500).json({ error: 'Failed to fund futures account' });
    }
}

/**
 * Transfer funds from futures to spot account
 * Usage: POST /api/kucoin/futures-to-spot { currency: "USDT", amount: "100" }
 * When to use: When users want to move funds from futures back to spot
 */
async function futurestoSpotTransfer(req, res) {
    try {
        const user = req.user;
        const { currency, amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid transfer amount' });
        }

        if (!currency) {
            return res.status(400).json({ error: 'Currency is required' });
        }

        // Check if user has sufficient balance in futures wallet
        const futuresBalance = await FuturesBalance.findOne({ user: user._id, coinId: currency });
        if (!futuresBalance || futuresBalance.balance < parseFloat(amount)) {
            return res.status(400).json({ error: 'Insufficient balance in futures wallet' });
        }

        const result = await kucoin.FuturesToSpotTransfer(currency, amount);
        
        // Update database balances
        await FuturesBalance.findOneAndUpdate(
            { user: user._id, coinId: currency },
            { $inc: { balance: -parseFloat(amount) } }
        );
        
        await SpotBalance.findOneAndUpdate(
            { user: user._id, coinId: currency },
            { $inc: { balance: parseFloat(amount) } },
            { upsert: true }
        );

        res.status(200).json(result);
    } catch (error) {
        console.error('Error transferring from futures to spot:', error);
        res.status(500).json({ error: 'Failed to transfer from futures to spot' });
    }
}

// ==================== SPOT TRADING CONTROLLERS ====================

/**
 * Submit spot order
 * Usage: POST /api/kucoin/spot-order { symbol: "BTC-USDT", side: "buy", type: "limit", quantity: "0.001", price: "50000" }
 * When to use: When users want to place buy/sell orders on spot market
 */
async function submitSpotOrder(req, res) {
    try {
        const { symbol, side, type, price, quantity, notional } = req.body;
        const user = req.user;

        if (!symbol || !side || !type) {
            return res.status(400).json({ error: 'Symbol, side, and type are required' });
        }

        const clientOrderId = uuidv4();
        const result = await kucoin.submitSpotOrder(clientOrderId, symbol, side, type, quantity, price, notional);

        if (result.data) {
            const orderCopyCode = uuidv4().slice(0, 6).toUpperCase();

            const orderHistory = new SpotOrderHistory({
                user: user._id,
                symbol: symbol.split('-')[0],
                quantity: quantity || notional,
                price,
                side,
                copyCode: orderCopyCode,
                orderId: result.data.orderId,
                status: 'pending',
                followers: []
            });

            await orderHistory.save();
        }

        res.status(200).json(result);
    } catch (error) {
        console.error('Error submitting spot order:', error);
        res.status(500).json({ error: 'Failed to submit spot order' });
    }
}

/**
 * Get spot order details
 * Usage: GET /api/kucoin/spot-order/:orderId
 * When to use: To check the status and details of a specific order
 */
async function getSpotOrderDetails(req, res) {
    try {
        const { orderId } = req.params;
        const order = await kucoin.getSpotOrder(orderId);
        res.status(200).json(order);
    } catch (error) {
        console.error('Error fetching spot order:', error);
        res.status(500).json({ error: 'Failed to fetch spot order' });
    }
}

/**
 * Get spot trading history
 * Usage: GET /api/kucoin/spot-trades?symbol=BTC-USDT&limit=10
 * When to use: To display user's trading history and filled orders
 */
async function getSpotTradingHistory(req, res) {
    try {
        const { symbol, startTime, endTime, limit } = req.query;
        const trades = await kucoin.getSpotTrades(symbol, 'spot', startTime, endTime, limit);
        res.status(200).json(trades);
    } catch (error) {
        console.error('Error fetching spot trades:', error);
        res.status(500).json({ error: 'Failed to fetch spot trades' });
    }
}

/**
 * Cancel spot order
 * Usage: DELETE /api/kucoin/spot-order/:orderId
 * When to use: When users want to cancel pending orders
 */
async function cancelSpotOrder(req, res) {
    try {
        const { orderId } = req.params;
        const result = await kucoin.cancelSpotOrder(orderId);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error cancelling spot order:', error);
        res.status(500).json({ error: 'Failed to cancel spot order' });
    }
}

// ==================== FUTURES TRADING CONTROLLERS ====================

/**
 * Get futures contracts
 * Usage: GET /api/kucoin/futures-contracts
 * When to use: To display available futures contracts to users
 */
async function getFuturesContracts(req, res) {
    try {
        const contracts = await kucoin.getFuturesContracts();
        res.status(200).json(contracts);
    } catch (error) {
        console.error('Error fetching futures contracts:', error);
        res.status(500).json({ error: 'Failed to fetch futures contracts' });
    }
}

/**
 * Submit futures order
 * Usage: POST /api/kucoin/futures-order { symbol: "XBTUSDTM", side: "buy", type: "limit", size: "1", price: "50000", leverage: 10 }
 * When to use: When users want to place futures orders with leverage
 */
async function submitFuturesOrder(req, res) {
    try {
        const { symbol, side, type, size, price, leverage } = req.body;
        const user = req.user;

        if (!symbol || !side || !type || !size) {
            return res.status(400).json({ error: 'Symbol, side, type, and size are required' });
        }

        const clientOrderId = uuidv4();
        const result = await kucoin.submitFuturesOrder(clientOrderId, symbol, side, type, size, price, leverage);

        res.status(200).json(result);
    } catch (error) {
        console.error('Error submitting futures order:', error);
        res.status(500).json({ error: 'Failed to submit futures order' });
    }
}

/**
 * Get futures positions
 * Usage: GET /api/kucoin/futures-positions?symbol=XBTUSDTM
 * When to use: To display user's current futures positions
 */
async function getFuturesPositions(req, res) {
    try {
        const { symbol } = req.query;
        const positions = await kucoin.getFuturesPositions(symbol);
        res.status(200).json(positions);
    } catch (error) {
        console.error('Error fetching futures positions:', error);
        res.status(500).json({ error: 'Failed to fetch futures positions' });
    }
}

/**
 * Get futures trading history
 * Usage: GET /api/kucoin/futures-trades?symbol=XBTUSDTM&pageSize=20
 * When to use: To display user's futures trading history
 */
async function getFuturesTradingHistory(req, res) {
    try {
        const { symbol, startAt, endAt, currentPage, pageSize } = req.query;
        const trades = await kucoin.getFuturesTrades(symbol, null, startAt, endAt, currentPage, pageSize);
        res.status(200).json(trades);
    } catch (error) {
        console.error('Error fetching futures trades:', error);
        res.status(500).json({ error: 'Failed to fetch futures trades' });
    }
}

// ==================== WITHDRAWAL CONTROLLERS ====================

/**
 * Withdraw from spot wallet
 * Usage: POST /api/kucoin/spot-withdraw { coinId: "BTC", amount: "0.001" }
 * When to use: When users want to withdraw funds from spot wallet to external address
 */
async function spotsWithdraw(req, res) {
    try {
        const user = req.user;
        const { coinId, amount } = req.body;
        let result;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid withdrawal amount' });
        }
        if (!coinId) {
            return res.status(400).json({ error: 'Coin ID is required' });
        }

        // Check if the user has sufficient balance in their spot wallet
        const spotBalance = await SpotBalance.findOne({ user: user._id, coinId: coinId });
        if (!spotBalance || spotBalance.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance in spot wallet' });
        }

        // Get the user's wallet address from CCPayment
        const referenceId = `${user._id.toString()}spot${uuidv4()}`;
        const response = await ccpayment.getOrCreateAppDepositAddress(coinId, referenceId);
        const parsedResponse = JSON.parse(response);
        
        if (parsedResponse.code === 10000 && parsedResponse.msg === "success") {
            const { address, memo } = parsedResponse.data;
            
            result = await kucoin.withdrawFromSpotWallet(
                spotBalance.currency, 
                amount, 
                "To Main Wallet", 
                address, 
                memo || ""
            );
        
            if (!result || result.error) {
                console.error('Error withdrawing from spot account:', result?.error || 'Unknown error');
                return res.status(500).json({ error: 'Failed to withdraw from spot account' });
            }
        } else {
            return res.status(500).json({ message: "Failed to get wallet address" });
        }

        // Update the user's spot balance in the database
        const updatedBalance = await SpotBalance.findOneAndUpdate(
            { user: user._id, coinId: coinId },
            { $inc: { balance: -amount } },
            { new: true }
        );

        // Create transaction record
        const transaction = new Transactions({
            user: user._id,
            coinId: coinId,
            currency: updatedBalance.currency,
            referenceId,
            withdrawalId: result.data?.withdrawalId,
            amount: amount,
            type: 'withdraw_spot_to_main',
            status: 'processing'
        });
        await transaction.save();

        res.status(200).json(result);
    } catch (error) {
        console.error('Error withdrawing from spot wallet:', error);
        res.status(500).json({ error: 'Failed to withdraw from spot wallet' });
    }
}

/**
 * Withdraw from futures wallet
 * Usage: POST /api/kucoin/futures-withdraw { coinId: "USDT", amount: "100" }
 * When to use: When users want to withdraw funds from futures wallet to external address
 */
async function futuresWithdraw(req, res) {
    try {
        const user = req.user;
        const { coinId, amount } = req.body;
        let result;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid withdrawal amount' });
        }
        if (!coinId) {
            return res.status(400).json({ error: 'Coin ID is required' });
        }

        // Check if the user has sufficient balance in their futures wallet
        const futuresBalance = await FuturesBalance.findOne({ user: user._id, coinId: coinId });
        if (!futuresBalance || futuresBalance.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance in futures wallet' });
        }

        // Get the user's wallet address from CCPayment
        const referenceId = `${user._id.toString()}futures${uuidv4()}`;
        const response = await ccpayment.getOrCreateAppDepositAddress(coinId, referenceId);
        const parsedResponse = JSON.parse(response);
        
        if (parsedResponse.code === 10000 && parsedResponse.msg === "success") {
            const { address, memo } = parsedResponse.data;
            
            result = await kucoin.withdrawFromFuturesWallet(
                futuresBalance.currency, 
                amount, 
                "To Main Wallet", 
                address, 
                memo || ""
            );
        
            if (!result || result.error) {
                console.error('Error withdrawing from futures account:', result?.error || 'Unknown error');
                return res.status(500).json({ error: 'Failed to withdraw from futures account' });
            }
        } else {
            return res.status(500).json({ message: "Failed to get wallet address" });
        }

        // Update the user's futures balance in the database
        const updatedBalance = await FuturesBalance.findOneAndUpdate(
            { user: user._id, coinId: coinId },
            { $inc: { balance: -amount } },
            { new: true }
        );

        // Create transaction record
        const transaction = new Transactions({
            user: user._id,
            coinId: coinId,
            currency: updatedBalance.currency,
            referenceId,
            withdrawalId: result.data?.withdrawalId,
            amount: amount,
            type: 'withdraw_futures_to_main',
            status: 'processing'
        });
        await transaction.save();

        res.status(200).json(result);
    } catch (error) {
        console.error('Error withdrawing from futures wallet:', error);
        res.status(500).json({ error: 'Failed to withdraw from futures wallet' });
    }
}

// ==================== HISTORY CONTROLLERS ====================

/**
 * Get deposit history
 * Usage: GET /api/kucoin/deposit-history?currency=BTC&limit=20
 * When to use: To display user's deposit transaction history
 */
async function getDepositHistory(req, res) {
    try {
        const { currency, startTime, endTime, limit } = req.query;
        const history = await kucoin.getDepositHistory(currency, startTime, endTime, limit);
        res.status(200).json(history);
    } catch (error) {
        console.error('Error fetching deposit history:', error);
        res.status(500).json({ error: 'Failed to fetch deposit history' });
    }
}

/**
 * Get withdrawal history
 * Usage: GET /api/kucoin/withdrawal-history?currency=BTC&limit=20
 * When to use: To display user's withdrawal transaction history
 */
async function getWithdrawalHistory(req, res) {
    try {
        const { currency, startTime, endTime, limit } = req.query;
        const history = await kucoin.getWithdrawalHistory(currency, startTime, endTime, limit);
        res.status(200).json(history);
    } catch (error) {
        console.error('Error fetching withdrawal history:', error);
        res.status(500).json({ error: 'Failed to fetch withdrawal history' });
    }
}

/**
 * Get withdrawal quotas
 * Usage: GET /api/kucoin/withdrawal-quota?currency=BTC&chain=BTC
 * When to use: To display withdrawal limits and fees to users
 */
async function getWithdrawalQuota(req, res) {
    try {
        const { currency, chain } = req.query;
        if (!currency) {
            return res.status(400).json({ error: 'Currency parameter is required' });
        }
        const quota = await kucoin.getWithdrawalQuota(currency, chain);
        res.status(200).json(quota);
    } catch (error) {
        console.error('Error fetching withdrawal quota:', error);
        res.status(500).json({ error: 'Failed to fetch withdrawal quota' });
    }
}

// ==================== TEST/DEBUG CONTROLLERS ====================

/**
 * Test spot order functionality
 * Usage: POST /api/kucoin/test-spot-order { orderId: "order-id-here" }
 * When to use: For testing and debugging order status
 */
async function testSpotOrder(req, res) {
    try {
        const { orderId } = req.body;
        if (!orderId) {
            return res.status(400).json({ error: 'Order ID is required' });
        }
        
        const spotOrder = await kucoin.getSpotOrder(orderId);
        console.log('Spot order details:', spotOrder);
        
        return res.status(200).json(spotOrder);
    } catch (error) {
        console.error('Error testing spot order:', error);
        res.status(500).json({ error: 'Failed to fetch spot order' });
    }
}

/**
 * Get server time from KuCoin
 * Usage: GET /api/kucoin/server-time
 * When to use: For synchronizing timestamps or debugging connectivity
 */
async function getServerTime(req, res) {
    try {
        const time = await kucoin.getServerTime();
        res.status(200).json(time);
    } catch (error) {
        console.error('Error fetching server time:', error);
        res.status(500).json({ error: 'Failed to fetch server time' });
    }
}

/**
 * Get KuCoin service status
 * Usage: GET /api/kucoin/service-status
 * When to use: To check if KuCoin services are operational
 */
async function getServiceStatus(req, res) {
    try {
        const status = await kucoin.getServiceStatus();
        res.status(200).json(status);
    } catch (error) {
        console.error('Error fetching service status:', error);
        res.status(500).json({ error: 'Failed to fetch service status' });
    }
}

module.exports = {
    // Market Data
    getTradingPairs,
    getAllCurrency,
    getDepositAddress,
    
    // Wallet Balances
    getSpotWalletBalance,
    getFuturesWalletBalance,
    getAccountBalance,
    getFuturesAccountBalance,
    
    // Transfers
    fundFuturesAccount,
    futurestoSpotTransfer,
    
    // Spot Trading
    submitSpotOrder,
    getSpotOrderDetails,
    getSpotTradingHistory,
    cancelSpotOrder,
    
    // Futures Trading
    getFuturesContracts,
    submitFuturesOrder,
    getFuturesPositions,
    getFuturesTradingHistory,
    
    // Withdrawals
    spotsWithdraw,
    futuresWithdraw,
    
    // History
    getDepositHistory,
    getWithdrawalHistory,
    getWithdrawalQuota,
    
    // Test/Debug
    testSpotOrder,
    getServerTime,
    getServiceStatus
};