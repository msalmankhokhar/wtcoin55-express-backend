const BitMart = require('../utils/bitmart');
const CCpayment = require('../utils/ccpayment');
const { SpotBalance } = require('../models/spot-balance');
const { FuturesBalance } = require('../models/futures-balance');
const { SpotOrderHistory } = require('../models/spot-order');
const { Transactions } = require('../models/transactions');
const { getSpotOrder } = require('../utils/helpers');


// Get the BitMart API variables
const { BITMART_API_KEY, BITMART_API_SECRET, BITMART_API_MEMO, BITMART_BASE_URL } = process.env;

// Create a new instance of BitMart API client
const bitmart = new BitMart(
    BITMART_API_KEY,
    BITMART_API_SECRET,
    BITMART_API_MEMO,
    BITMART_BASE_URL
);

console.log(bitmart);

const { CCPAYMENT_APP_SECRET, CCPAYMENT_APP_ID, CCPAYMENT_BASE_URL } = process.env;

const ccpayment = new CCpayment(
    CCPAYMENT_APP_SECRET,
    CCPAYMENT_APP_ID,
    CCPAYMENT_BASE_URL
)

// Funtions to handle BitMart API requests
// Wallet Transfer Controller
// This controller handles wallet transfers for BitMart, including spots and futures using Bitmart apis
// 
// Hnadle Futures Initialization with Bitmart API
// Hnadle Futures Initialization with SPot API
// HANDLE SPOT AND FUTURES TRANSFERS


// Get a list of all trading pairs on the platform
async function getTradingPairs(req, res) {
    try {
        const pairs = await bitmart.getAllTradingPairs();
        res.status(200).json(pairs);
    } catch (error) {
        console.error('Error fetching trading pairs:', error);
        res.status(500).json({ error: 'Failed to fetch trading pairs' });
    }
};


async function getAllCurrency(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    try {
        const currencies = require('../filtered_bitmart.json');
        const offset = (page - 1) * limit;
        const filteredCurrencies = currencies
            .slice(offset, offset + limit)
            .map(currency => ({
                currency: currency.currency,
                name: currency.name,
                network: currency.network
            }));
        const meta = {
            prev: page > 1 ? `/api/bitmart/currencies?page=${page - 1}&limit=${limit}` : null,
            next: page < Math.ceil(currencies.length / limit) ? `/api/bitmart/currencies?page=${page + 1}&limit=${limit}` : null
        };
        return res.status(200).json({ data: filteredCurrencies, meta });
    } catch (error) {
        console.error('Error fetching all currencies:', error);
        throw new Error('Failed to fetch all currencies');
    }
}

async function getDepositAddress(req, res) {
    const { currency } = req.query;
    try {
        const address = await bitmart.getDepositAddress(currency);
        res.status(200).json(address);
    } catch (error) {
        console.error('Error fetching deposit address:', error);
        res.status(500).json({ error: 'Failed to fetch deposit address' });
    }
}

async function getSpotWalletBalance(req, res) {
    try {
        const user = req.user;
        const coinId = req.params.coinId || "";
        let balance

        if (coinId !== "") {
            balance = await SpotBalance.findOne({ user: user._id, coinId });
        } else {
            balance = await SpotBalance.find({ user: user._id});
        }
        res.status(200).json(balance);
    } catch (error) {
        console.error('Error fetching spot balance:', error);
        res.status(500).json({ error: 'Failed to fetch spot balance' });
    }
}

async function getFuturesWalletBalance(req, res) {
    try {
        const user = req.user;
        const coinId = req.params.coinId || "";
        let balance

        if (coinId !== "") {
            balance = await FuturesBalance.findOne({ user: user._id, coinId })
        } else {
            balance = await FuturesBalance.find({ user: user._id})
        }
        res.status(200).json(balance);
    } catch (error) {
        console.error('Error fetching spot balance:', error);
        res.status(500).json({ error: 'Failed to fetch spot balance' });
    }
}

async function fundFuturesAccount(req, res) {
    try {
        const user = req.user;
        const { currency, amount } = req.body;

        // Validate and fund the user's futures account
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid funding amount' });
        }

        const result = await bitmart.SpotToFuturesTransfer(currency, amount);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error funding futures account:', error);
        res.status(500).json({ error: 'Failed to fund futures account' });
    }
}


async function submitSpotOrder(req, res) {
    try {
        const { symbol, side, type, price, quantity } = req.body;
        const { order, error } = await bitmart.submitSpotOrder(symbol, side, type, price, quantity);

        if (error) {
            return res.status(500).json({ error: 'Failed to submit spot order' });
        }

        // Determine initial role based on order type
        let preliminaryRole = 'pending'; // We'll update this when we get execution data
        if (type === 'market') {
            preliminaryRole = 'taker'; // Market orders are always takers
        }

        const orderCopyCode = uuidv4().slice(0, 6);

        const orderHistory = new SpotOrderHistory({
            user: req.user._id,
            symbol: symbol, // Base currency
            quantity: quantity || 0,
            price: price || 0,
            side,
            type,
            role: preliminaryRole,
            owner: true,
            copyCode: orderCopyCode,
            orderId: order.order_id,
            status: 'pending',
            followers: []
        });

        await orderHistory.save();

        res.status(200).json(order);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to submit spot order' });
    }
}

async function FollowSpotOrder(req, res) {
    try {
        const { copyCode } = req.body;

        // Find Order
        const spotOrder = await SpotOrderHistory.findOne({ copyCode });

        if (!spotOrder || spotOrder.status !== 'pending') {
            return res.status(406).json({ message: 'Invalid Order' });
        }
        const { symbol, side, type, price, quantity } = spotOrder;

        // Check if account is funded
        const balance = await SpotBalance.findOne({ user: req.user._id, currency: symbol});
        if (!balance) {
            return res.status(400).json({ message: 'Insufficient Balance' });
        }

        const { order, error } = await bitmart.submitSpotOrder(symbol, side, type, price, quantity);

        if (error) {
            return res.status(500).json({ error: 'Failed to submit spot order' });
        }

        // Determine initial role based on order type
        let preliminaryRole = 'pending'; // We'll update this when we get execution data
        if (type === 'market') {
            preliminaryRole = 'taker'; // Market orders are always takers
        }

        const orderHistory = new SpotOrderHistory({
            user: req.user._id,
            symbol: symbol.split('_')[0], // Base currency
            quantity: quantity || 0,
            price: price || 0,
            side,
            type,
            role: preliminaryRole,
            owner: false,
            copyCode,
            orderId: order.order_id,
            status: 'pending',
            followers: []
        });

        await orderHistory.save();

        res.status(200).json(order);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to submit spot order' });
    }
}


async function spotsWithdraw(req, res) {
    try {
        const user = req.user;
        const { coinId, amount } = req.body;
        let result;

        // Validate and fund the user's spot account
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid spot amount' });
        }
        if (!coinId) {
            return res.status(400).json({ error: 'Coin ID is required' });
        }

        // Check if the user has sufficient balance in their spot wallet
        const spotBalance = await SpotBalance.findOne({ user: user._id, coinId: coinId });
        if (!spotBalance|| spotBalance.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance in spot wallet' });
        }

        // Get the user's wallet address
        const referenceId = `${user._id.toString()}${'spot'}${uuidv4()}`;

        const response = ccpayment.getOrCreateAppDepositAddress(coinId, referenceId);
        const { code, msg, data } = JSON.parse(response);
        if (code === 10000 && msg === "success") {
            const { address, memo } = data;
            
            result = await bitmart.withdrawFromSpotWallet(spotBalance.currency, amount, destination="To Main Wallet", address, memo || "");
        
            if (!result || result.error) {
                console.error('Error funding spot account:', result.error || 'Unknown error');
                return res.status(500).json({ error: 'Failed to fund spot account' });
            }
    
        } else {
            return res.status(500).json({ message: "Failed to get wallet address" });
        }

        // Update the user's spot balance in the database
        const updatedBalance = await SpotBalance.findOneAndUpdate(
            { user: user._id, coinId: coinId },
            { $inc: { balance: -amount } },
            { new: true, upsert: true }
        );

        // Update Transaction History
        await Transactions({
            user: user._id,
            coinId: coinId,
            currency: updatedBalance.currency,
            referenceId,
            withdrawalId: result.data.withdrawId,
            amount: amount,
            type: 'withdraw_spot_to_main',
            status: 'processing'
        });

        res.status(200).json(result);
    } catch (error) {
        console.error('Error withdrawing from spot wallet:', error);
        res.status(500).json({ error: 'Failed to withdraw from spot wallet' });
    }
}

async function futuresWithdraw(req, res) {
    try {
        const user = req.user;
        const { coinId, amount } = req.body;
        let result;

        // Validate and fund the user's futures account
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid funding amount' });
        }
        if (!coinId) {
            return res.status(400).json({ error: 'Coin ID is required' });
        }

        // Check if the user has sufficient balance in their future wallet
        const futuresBalance = await FuturesBalance.findOne({ user: user._id, coinId: coinId });
        if (!futuresBalance || futuresBalance.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance in futures wallet' });
        }

        // Get the user's wallet address
        const referenceId = `${user._id.toString()}${'futures'}${uuidv4()}`;

        const response = ccpayment.getOrCreateAppDepositAddress(coinId, referenceId);
        const { code, msg, data } = JSON.parse(response);
        if (code === 10000 && msg === "success") {
            const { address, memo } = data;
            
            result = await bitmart.withdrawFromFuturesWallet(futuresBalance.currency, amount, destination="To Main Wallet", address, memo || "");
        
            if (!result || result.error) {
                console.error('Error funding futures account:', result.error || 'Unknown error');
                return res.status(500).json({ error: 'Failed to fund futures account' });
            }
    
        } else {
            return res.status(500).json({ message: "Failed to get wallet address" });
        }

        // Update the user's futures balance in the database
        const updatedBalance = await FuturesBalance.findOneAndUpdate(
            { user: user._id, coinId: coinId },
            { $inc: { balance: -amount } },
            { new: true, upsert: true }
        );

        // Update Transaction History
        await Transactions({
            user: user._id,
            coinId: coinId,
            currency: updatedBalance.currency,
            amount: amount,
            withdrawalId: result.data.withdrawId,
            type: 'withdraw_futures_to_main',
            status: 'processing'
        });

        res.status(200).json(result);
    } catch (error) {
        console.error('Error funding futures account:', error);
        res.status(500).json({ error: 'Failed to fund futures account' });
    }
}

async function testSpotOrder(req, res) {
    const spotHist = await getSpotOrder(req.body.orderId);
    console.log(spotHist);

    return res.status(200).json(spotHist);
}

module.exports = {
    getTradingPairs,
    getAllCurrency,
    getDepositAddress,
    getFuturesWalletBalance,
    getSpotWalletBalance,
    fundFuturesAccount,
    submitSpotOrder,
    spotsWithdraw,
    futuresWithdraw,
    testSpotOrder
}
