const BitMart = require('../utils/bitmart');
const CCpayment = require('../utils/ccpayment');
const { SpotBalance } = require('../models/spot-balance');
const { FuturesBalance } = require('../models/futures-balance');
const { SpotOrderHistory } = require('../models/spot-order');
const { FuturesOrderHistory } = require('../models/future-order');
const { Transactions } = require('../models/transactions');
const { getSpotOrder } = require('../utils/helpers');
const { v4: uuidv4 } = require('uuid');


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
        // getCurrencies() is async, so await it
        const currencies = await bitmart.getCurrencies();
        
        // Validate that currencies is an array
        if (!Array.isArray(currencies)) {
            console.error('Currencies is not an array:', typeof currencies, currencies);
            return res.status(500).json({ 
                error: 'Invalid data format from BitMart API',
                type: typeof currencies 
            });
        }

        const offset = (page - 1) * limit;
        const filteredCurrencies = currencies
            .slice(offset, offset + limit)
            .map(symbol => ({
                symbol: symbol.symbol,
                baseCurrency: symbol.base_currency,
                quoteCurrency: symbol.quote_currency,
                baseMinSize: symbol.base_min_size,
                baseMaxSize: symbol.base_max_size,
                priceMinPrecision: symbol.price_min_precision,
                priceMaxPrecision: symbol.price_max_precision,
                expiration: symbol.expiration,
                minBuyAmount: symbol.min_buy_amount,
                minSellAmount: symbol.min_sell_amount
            }));

        const meta = {
            totalItems: currencies.length,
            currentPage: page,
            totalPages: Math.ceil(currencies.length / limit),
            prev: page > 1 ? `/api/bitmart/currencies?page=${page - 1}&limit=${limit}` : null,
            next: page < Math.ceil(currencies.length / limit) ? `/api/bitmart/currencies?page=${page + 1}&limit=${limit}` : null
        };

        return res.status(200).json({ 
            success: true,
            data: filteredCurrencies, 
            meta 
        });

    } catch (error) {
        console.error('Error fetching all currencies:', error);
        return res.status(500).json({ 
            success: false,
            error: 'Failed to fetch currencies',
            message: error.message 
        });
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
        console.log(req.user);
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

// async function fundFuturesAccount(req, res) {
//     try {
//         const user = req.user;
//         const { currency, amount } = req.body;

//         // Validate and fund the user's futures account
//         if (!amount || amount <= 0) {
//             return res.status(400).json({ error: 'Invalid funding amount' });
//         }

//         const result = await bitmart.SpotToFuturesTransfer(currency, amount);
//         res.status(200).json(result);
//     } catch (error) {
//         console.error('Error funding futures account:', error);
//         res.status(500).json({ error: 'Failed to fund futures account' });
//     }
// }



async function submitSpotOrder(req, res) {
    try {
        const { symbol, side, type, price, quantity, notional="" } = req.body;
        let balance;

        // symbol = BUYINGCOIN_BASECOIN
        // Get Base coin
        if (symbol.split("_")[0] === 'USDT') {
            balance = await SpotBalance.findOne({ coinId: 1280});
        }
        else {
            balance = await SpotBalance.findOne({ coinName: symbol.split("_")[0] });
        }
        const orderCost = quantity * price;

        if (!balance || balance.balance < orderCost) {
            return res.status(400).json({ message: 'Insufficient funds' });
        }

        const data = await bitmart.submitSpotOrder(symbol, side, type, price, quantity, notional);
        console.log(data);

        if (data.code !== 1000 || data.error) {
            return res.status(500).json({ error: 'Failed to submit spot order' });
        }

        // Determine initial role based on order type
        let preliminaryRole = 'pending';
        if (type === 'market') {
            preliminaryRole = 'taker';
        }

        const orderCopyCode = uuidv4().slice(0, 6);

        const orderHistory = new SpotOrderHistory({
            user: req.user._id,
            symbol: symbol,
            quantity: quantity || 0,
            price: price || 0,
            side,
            type,
            role: preliminaryRole,
            owner: true,
            copyCode: orderCopyCode,
            orderId: data.data.order_id,
            status: 'pending',
            followers: []
        });

        await orderHistory.save();

        res.status(200).json(data);
    } catch (error) {
        console.log(error);
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
    const spotHist = await bitmart.getSpotOrder(req.body.orderId);
    console.log(spotHist);

    return res.status(200).json(spotHist);
}


async function testTrades(req, res) {
    const spotHist = await bitmart.getSpotTrades(req.body.symbol);
    console.log(spotHist);

    return res.status(200).json(spotHist);
}

// async function transferFromSpotsToFutures(req, res) {
//     try {
//         const { currency, amount } = req.body;
//         const userId = req.user._id;

//         console.log(`Transfer request: ${amount} ${currency} from Spot to Futures for user ${userId}`);

//         // Validate input
//         if (!currency || !amount || amount <= 0) {
//             return res.status(400).json({ 
//                 success: false, 
//                 error: 'Invalid currency or amount' 
//             });
//         }

//         // ✅ CHECK ACTUAL SPOT BALANCE FROM SpotBalance COLLECTION
//         let spotBalance;

//         if (currency === 'USDT') {
//             spotBalance = await SpotBalance.findOne({
//                 user: userId,
//                 coinId: 1280
//             });
//         } else {
//             spotBalance = await SpotBalance.findOne({
//                 user: userId,
//                 coinName: currency.toUpperCase()
//             });
//         }


//         if (!spotBalance) {
//             return res.status(400).json({ 
//                 success: false, 
//                 error: `No ${currency} balance found in spot wallet` 
//             });
//         }

//         const availableBalance = spotBalance.balance;
//         console.log(`Current ${currency} spot balance: ${availableBalance}`);

//         // Check if sufficient balance
//         if (availableBalance < amount) {
//             return res.status(400).json({ 
//                 success: false, 
//                 error: `Insufficient ${currency} balance in spot wallet. Available: ${availableBalance.toFixed(8)}, Requested: ${amount}` 
//             });
//         }

//         // Execute transfer via BitMart API
//         console.log(`Executing transfer: ${amount} ${currency} to futures account...`);
        
//         const transferResponse = await bitmart.SpotToFuturesTransfer(currency, amount);

//         if (transferResponse.code !== 1000) {
//             console.error('BitMart transfer failed:', transferResponse);
//             return res.status(400).json({ 
//                 success: false, 
//                 error: transferResponse.message || 'Transfer failed' 
//             });
//         }

//         // ✅ UPDATE BOTH SPOT AND FUTURES BALANCES
//         const transferAmount = parseFloat(amount);

//         // Decrease spot balance
//         await SpotBalance.findByIdAndUpdate(spotBalance._id, {
//             $inc: { balance: -transferAmount },
//             updatedAt: new Date()
//         });

//         // Get coinId from existing spot balance or use dynamic lookup
//         let coinId = spotBalance.coinId; // Use the same coinId from spot balance
        
//         // If spot balance doesn't have coinId, try to find it from futures or use fallback
//         if (!coinId) {
//             // Try to find existing futures balance for this currency
//             const existingFuturesBalance = await FuturesBalance.findOne({
//                 user: userId,
//                 coinName: currency.toUpperCase()
//             });
            
//             if (existingFuturesBalance) {
//                 coinId = existingFuturesBalance.coinId;
//             } else {
//                 // Fallback: use a dynamic coinId or just the currency name
//                 coinId = null; // We'll create without coinId and just use coinName
//             }
//         }

//         // Find or create futures balance (search by coinName if no coinId)
//         let futuresBalance;
//         if (coinId) {
//             futuresBalance = await FuturesBalance.findOne({
//                 user: userId,
//                 coinId: coinId
//             });
//         } else {
//             futuresBalance = await FuturesBalance.findOne({
//                 user: userId,
//                 coinName: currency.toUpperCase()
//             });
//         }

//         if (futuresBalance) {
//             // Update existing balance
//             await FuturesBalance.findByIdAndUpdate(futuresBalance._id, {
//                 $inc: { balance: transferAmount },
//                 updatedAt: new Date()
//             });
//         } else {
//             // Create new futures balance (use coinId from spot if available)
//             futuresBalance = new FuturesBalance({
//                 user: userId,
//                 coinId: spotBalance.coinId || null, // Use spot's coinId or null
//                 coinName: currency.toUpperCase(),
//                 balance: transferAmount,
//                 createdAt: new Date(),
//                 updatedAt: new Date()
//             });
//             await futuresBalance.save();
//         }

//         // Record the transfer for tracking
//         const transferRecord = {
//             userId: userId,
//             currency: currency,
//             amount: transferAmount,
//             type: 'spot_to_futures',
//             timestamp: new Date(),
//             bitMartTransferId: transferResponse.data?.transfer_id || null,
//             status: 'completed'
//         };

//         console.log(`✅ Successfully transferred ${amount} ${currency} to futures account`);
//         console.log(`Transfer ID: ${transferResponse.data?.transfer_id || 'N/A'}`);

//         // Get updated balances
//         const newSpotBalance = availableBalance - transferAmount;
//         const newFuturesBalance = (futuresBalance.balance || 0) + transferAmount;

//         // Return success response
//         res.status(200).json({
//             success: true,
//             message: `Successfully transferred ${amount} ${currency} to futures account`,
//             data: {
//                 transferId: transferResponse.data?.transfer_id,
//                 currency: currency,
//                 amount: transferAmount,
//                 balances: {
//                     spot: {
//                         currency: currency,
//                         previous: availableBalance,
//                         current: newSpotBalance
//                     },
//                     futures: {
//                         currency: currency,
//                         previous: (futuresBalance.balance || 0) - transferAmount,
//                         current: newFuturesBalance
//                     }
//                 }
//             }
//         });

//     } catch (error) {
//         console.error('Error in transferFromSpotsToFutures:', error);
//         res.status(500).json({ 
//             success: false, 
//             error: 'Failed to transfer funds to futures account',
//             details: error.message 
//         });
//     }
// }

async function submitFuturesOrder(req, res) {
    try {
        const { symbol, side, type, quantity, price, leverage } = req.body;

        if (symbol.split("_")[0] === 'USDT') {
            balance = await FuturesBalance.findOne({ coinId: 1280});
        }
        else {
            balance = await FuturesBalance.findOne({ coinName: symbol.split("_")[0] });
        }
        // const orderCost = quantity * price;

        // if (!balance || balance.balance < orderCost) {
        //     return res.status(400).json({ message: 'Insufficient funds' });
        // }
        if (!balance) {
            return res.status(400).json({ message: 'Insufficient funds' });
        }

        const result = await bitmart.submitFuturesOrder(symbol, side, type, quantity, price, leverage);
        if (result.code !== 1000 || data.error) {
            return res.status(500).json({ error: 'Failed to submit futures order' });
        }

        const orderCopyCode = uuidv4().slice(0, 6);
        let marketPrice = result.data.price;
        marketPrice = marketPrice !== 'market price' ? parseFloat(marketPrice) : 0;

        const orderHistory = new FuturesOrderHistory({
            user: req.user._id,
            symbol: symbol,
            quantity: quantity || 0,
            price: price || 0,
            marketPrice,
            side,
            type,
            role: preliminaryRole,
            owner: true,
            copyCode: orderCopyCode,
            orderId: result.data.order_id,
            status: 'pending',
            followers: []
        });

        await orderHistory.save();

        // console.log(result);
        return res.status(200).json(result);
    } catch (error) {
        console.log("Error: ", error);
        return res.status(500).json({ error: error.message });
    }
}


async function submitFuturesPlanOrder(req, res) {
    try {
        const {
            symbol,
            side,
            type,
            leverage,
            open_type = 'isolated',
            size,
            trigger_price,
            executive_price,
            price_way,
            price_type,
            mode,
            preset_take_profit_price,
            preset_stop_loss_price,
            preset_take_profit_price_type,
            preset_stop_loss_price_type,
            plan_category,
            client_order_id
        } = req.body;

        const userId = req.user._id;

        console.log(`Futures plan order request from user ${userId}: ${type} ${side} ${size} ${symbol}`);

        // Validate required fields
        if (!symbol || !side || !type || !leverage || !size || !trigger_price || !price_way || !price_type) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: symbol, side, type, leverage, size, trigger_price, price_way, price_type'
            });
        }

        // Check balance for the quote currency (usually USDT)
        const quoteCurrency = symbol.split('_')[1] || 'USDT'; // ETHUSDT -> USDT
        console.log(quoteCurrency);
        let balance;

        if (quoteCurrency === 'USDT') {
            console.log(userId);
            balance = await FuturesBalance.findOne({ coinId: 1280 });
            console.log(balance);
        } else {
            balance = await FuturesBalance.findOne({ user: userId, coinName: quoteCurrency });
        }

        // console

        if (!balance) {
            return res.status(400).json({
                success: false,
                error: `No ${quoteCurrency} balance found for futures trading`
            });
        }

        // Calculate required margin (simplified calculation)
        const triggerPrice = parseFloat(trigger_price);
        const leverageNum = parseFloat(leverage);
        const contractSize = parseInt(size);
        const requiredMargin = (triggerPrice * contractSize) / leverageNum;

        console.log(`Required margin: ${requiredMargin} ${quoteCurrency}, Available: ${balance.balance}`);

        if (balance.balance < requiredMargin) {
            return res.status(400).json({
                success: false,
                error: `Insufficient ${quoteCurrency} balance. Required: ${requiredMargin}, Available: ${balance.balance}`
            });
        }

        // Prepare options for advanced features
        const options = {};
        if (mode) options.mode = mode;
        if (client_order_id) options.client_order_id = client_order_id;
        if (plan_category) options.plan_category = plan_category;
        if (preset_take_profit_price) {
            options.preset_take_profit_price = preset_take_profit_price;
            options.preset_take_profit_price_type = preset_take_profit_price_type || 1;
        }
        if (preset_stop_loss_price) {
            options.preset_stop_loss_price = preset_stop_loss_price;
            options.preset_stop_loss_price_type = preset_stop_loss_price_type || 1;
        }

        // Submit order to BitMart
        console.log('Submitting plan order to BitMart...');
        const result = await bitmart.submitFuturesPlanOrder(
            symbol,
            side,
            type,
            leverage,
            open_type,
            size,
            trigger_price,
            executive_price,
            price_way,
            price_type,
            options
        );

        if (result.code !== 1000) {
            console.error('BitMart plan order failed:', result);
            return res.status(400).json({
                success: false,
                error: result.message || 'Failed to submit futures plan order'
            });
        }

        // Generate copy trading code
        const { v4: uuidv4 } = require('uuid');
        const orderCopyCode = uuidv4().slice(0, 6);

        // Save order to database
        const orderHistory = new FuturesOrderHistory({
            user: userId,
            symbol: symbol,
            orderId: result.data?.order_id,
            side: parseInt(side),
            type: type,
            leverage: leverage,
            open_type: open_type,
            size: contractSize,
            trigger_price: trigger_price,
            executive_price: executive_price,
            price_way: parseInt(price_way),
            price_type: parseInt(price_type),
            mode: options.mode || 1,
            plan_category: options.plan_category,
            client_order_id: options.client_order_id,
            preset_take_profit_price: options.preset_take_profit_price,
            preset_stop_loss_price: options.preset_stop_loss_price,
            preset_take_profit_price_type: options.preset_take_profit_price_type,
            preset_stop_loss_price_type: options.preset_stop_loss_price_type,
            total_cost: requiredMargin,
            owner: true,
            copyCode: orderCopyCode,
            status: 'pending',
            followers: []
        });


        await orderHistory.save();

        console.log(`✅ Futures plan order saved with ID: ${orderHistory._id}`);

        // Return success response
        res.status(200).json({
            success: true,
            message: 'Futures plan order submitted successfully',
            data: {
                orderId: result.data?.order_id,
                localOrderId: orderHistory._id,
                copyCode: orderCopyCode,
                symbol: symbol,
                side: side,
                type: type,
                size: size,
                trigger_price: trigger_price,
                executive_price: executive_price,
                requiredMargin: requiredMargin,
                bitMartResponse: result.data
            }
        });

    } catch (error) {
        console.error('Error in submitFuturesPlanOrder:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit futures plan order',
            details: error.message
        });
    }
}


async function GetContractDetails(req, res) {
    try {
        const response = await bitmart.getContractDetails(req.body.symbol);

        return res.status(200).json({ data: response });
    } catch (error) {
        console.log("Error: ", error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}




module.exports = {
    getTradingPairs,
    getAllCurrency,
    getDepositAddress,
    getFuturesWalletBalance,
    getSpotWalletBalance,
    // fundFuturesAccount,
    submitSpotOrder,
    spotsWithdraw,
    futuresWithdraw,
    // transferFromSpotsToFutures,
    testSpotOrder,
    testTrades,
    submitFuturesOrder,
    submitFuturesPlanOrder,
    GetContractDetails
}
