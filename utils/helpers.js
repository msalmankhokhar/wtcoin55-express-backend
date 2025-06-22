const crypto = require('crypto');
const { Users } = require('../models/users');
const { OTP } = require('../models/otp');
const { Reset_OTP } = require('../models/reset-otp');
const { SpotBalance } = require('../models/spot-balance');
const { FuturesBalance } = require('../models/futures-balance');
const { Transactions } = require('../models/transactions');
const { FuturesOrderHistory } = require('../models/future-order');
const BitMart = require('../utils/bitmart');
const { SpotOrderHistory } = require('../models/spot-order');
const bitmart = new BitMart(
    process.env.BITMART_API_KEY,
    process.env.BITMART_API_SECRET,
    process.env.BITMART_API_MEMO,
    process.env.BITMART_BASE_URL
);

/**
 * Generates a numeric OTP of a given length
 * @param {number} length 
 * @returns {string}
 */
function generateNumericOTP(length = 6) {
    return Array.from(crypto.randomBytes(length))
        .map(byte => (byte % 10).toString()) // Fix typo from toxString to toString
        .join('');
}

/**
 * Creates or replaces OTP for a given email
 * @param {string} emailOrPhonenumber 
 * @returns {Promise<string>} the newly generated OTP
 */
async function createOrUpdateOTP(emailOrPhonenumber) {
    // Delete any existing OTP for the email
    const otpExists = await OTP.findOneAndDelete({
        $or: [
            { email: emailOrPhonenumber },
            { phonenumber: emailOrPhonenumber }
        ]
        });


    if (otpExists) {
        console.log(`Deleted existing OTP for ${emailOrPhonenumber}`);
    }

    // Generate a new OTP
    const otpCode = generateNumericOTP();

    // Create and save the new OTP
    const newOtp = new OTP({ emailOrPhone: emailOrPhonenumber, otp: otpCode });
    await newOtp.save();

    return otpCode;
}


/**
 * Creates or replaces OTP for a given email
 * @param {string} emailOrPhonenumber 
 * @returns {Promise<string>} the newly generated OTP
 */
async function createOrUpdateResetOTP(emailOrPhonenumber) {
    // Delete any existing OTP for the email
    let otpExists;
    
    otpExists = await Reset_OTP.findOneAndDelete({ $or: [{email: emailOrPhonenumber}, {phonenumber: emailOrPhonenumber}] });

    if (otpExists) {
        console.log(`Deleted existing OTP for ${emailOrPhonenumber}`);
    }

    // Generate a new OTP
    const otpCode = generateNumericOTP();

    // Create and save the new OTP
    const newOtp = new Reset_OTP({ emailOrPhone: emailOrPhonenumber, otp: otpCode });
    await newOtp.save();

    return otpCode;
}


// Generate referal code
async function generateReferralCdoe(length = 6) {
    const refCode = crypto.randomBytes(6).toString('hex').toUpperCase();

    const checkIfExist = await Users.findOne({ refCode: refCode });
    if (checkIfExist) return generateReferralCdoe(length);

    return refCode;
}

/**
 * Validate verification code
 * @param {string} emailOrPhonenumber 
 * @param {string} code 
 * @returns {Promise<bool>, Promise<string>} the message
 */
async function validateVerificationCode(emailOrPhonenumber, code) {
    let lowerCaseEmailOrPhone = emailOrPhonenumber.toLowerCase().trim();
    existingUser = await Users.findOne({ $or: [{email: lowerCaseEmailOrPhone}, {phonenumber: lowerCaseEmailOrPhone}] });

    if (existingUser) return [false, "User already exists"];

    // Get the verification status
    // console.log(lowerCaseEmailOrPhone, code);
    verificationStatus = await OTP.findOne({ emailOrPhone: lowerCaseEmailOrPhone, otp: code });
    // console.log(verificationStatus);

    if (!verificationStatus || verificationStatus.status !== 'pending') {
        // return res.status(400).json({ message: 'Invalid verification code' });
        // console.log("Invalid verification code");
        return [false, "Invalid verification code"];
    } 
    else if (verificationStatus.expiredAt < Date.now()) {
        // return ({ message: 'Verification code has expired' });
        return [false, "Verification code has expired"];
    }
    else if (verificationStatus && verificationStatus.status === 'pending') {
        // console.log("I got here");
        verificationStatus.status = 'verified';
        verificationStatus.expiredAt = new Date();
        await verificationStatus.save();
        return [true, "Verification successful"];
    }

    // Update the verification status
    return [false, "Verification failed"];
}

/**
 * Updates the trading wallet balance based on the provided transaction.
 *
 * @param {Object} transaction - The transaction object containing type, userId, coinId, amount, currency, chain, and memo.
 * @return {Promise<void>} - Resolves when the trading wallet balance has been updated.
 */
async function updateTradingWallet(transaction) {
    const { type, user, coinId, amount, currency, chain, memo } = transaction;
    console.log(transaction);
    const balanceModel = type === "deposit_to_spots" ? SpotBalance : FuturesBalance;
    if (!user) return "User not found";

    let balance = await balanceModel.findOne({ user, coinId });
    if (balance) {
        balance.balance += amount;
        await balance.save();
    } else {
        balance = new balanceModel({
            user,
            coinId,
            balance: amount,
            currency,
            chain,
            memo: memo || "",
            updatedAt: new Date(),
        });
        await balance.save();
    }

    if (type === "deposit_to_futures") {
        console.log("How far");
        // await bitmart.SpotToFuturesTransfer(currency, amount);
    }

    // Update the transaction status
    await Transactions.updateOne(
        { _id: transaction._id },
        { $set: { status: 'completed', webhookStatus: 'completed', updatedAt: Date.now() } }
    );
}

/**
 * Get Spot Order Details and Try to Match Trades
 * @param {string} orderId - BitMart order ID
 * @returns {Promise<Object>} - Updated order data
 */
async function getSpotOrder(orderId) {
    console.log(`🔍 [getSpotOrder] Starting order lookup for: ${orderId}`);
    
    try {
        // 1. First try to get order details from history (completed orders)
        console.log(`📋 [getSpotOrder] Attempting to get order from history...`);
        let orderResponse = await bitmart.getSpotOrder(orderId);
        
        console.log(`📊 [getSpotOrder] Initial order response:`, {
            code: orderResponse.code,
            message: orderResponse.message,
            hasData: !!orderResponse.data,
            dataKeys: orderResponse.data ? Object.keys(orderResponse.data) : []
        });

        // 2. If order not found in history, try open orders
        if (orderResponse.code !== 1000 || !orderResponse.data) {
            console.log(`⚠️ [getSpotOrder] Order not found in history, trying open orders...`);
            
            // Try to get from open orders (this might need a different approach)
            // For now, let's assume the order exists but might be in a different state
            console.log(`❌ [getSpotOrder] Order ${orderId} not found in BitMart API`);
            return {
                orderId: orderId,
                error: 'Order not found in BitMart API',
                needsUpdate: false
            };
        }

        const orderData = orderResponse.data;
        console.log(`✅ [getSpotOrder] Order found! State: ${orderData.state}, Symbol: ${orderData.symbol}`);
        console.log(`📊 [getSpotOrder] Order details:`, {
            orderId: orderData.orderId,
            symbol: orderData.symbol,
            state: orderData.state,
            side: orderData.side,
            type: orderData.type,
            size: orderData.size,
            filledSize: orderData.filledSize,
            price: orderData.price,
            priceAvg: orderData.priceAvg,
            filledNotional: orderData.filledNotional,
            createTime: orderData.createTime,
            updateTime: orderData.updateTime
        });

        // 3. Check if order needs trade analysis
        if (orderData.state !== 'filled' && orderData.state !== 'partially_filled') {
            // Check if it's a partially cancelled order with some fills
            if (orderData.state === 'partially_canceled' && parseFloat(orderData.filledSize || 0) > 0) {
                console.log(`⚠️ [getSpotOrder] Order ${orderId} is partially cancelled but has fills: ${orderData.filledSize}`);
                // Continue processing to handle the partial fills
            } else if (orderData.state === 'canceled' && parseFloat(orderData.filledSize || 0) > 0) {
                console.log(`⚠️ [getSpotOrder] Order ${orderId} is cancelled but has fills: ${orderData.filledSize}`);
                // Continue processing to handle the fills that occurred before cancellation
            } else {
                console.log(`⏭️ [getSpotOrder] Order ${orderId} is not filled (state: ${orderData.state}), skipping trade analysis`);
            return {
                orderId: orderData.orderId,
                    symbol: orderData.symbol,
                state: orderData.state,
                    side: orderData.side,
                    type: orderData.type,
                filledSize: orderData.filledSize || '0',
                priceAvg: orderData.priceAvg || '0',
                needsUpdate: false
            };
            }
        }

        // 4. Get specific trades for this order using the dedicated endpoint
        console.log(`🔍 [getSpotOrder] Getting trades for order ${orderId}...`);
        let orderTrades = [];
        let totalFees = 0;
        let feeType = 'taker';
        let feeCurrency = 'USDT';

        try {
            const tradesResponse = await bitmart.getOrderTrades(orderId);
            console.log(`📊 [getSpotOrder] Trades response:`, {
                code: tradesResponse.code,
                message: tradesResponse.message,
                hasData: !!tradesResponse.data,
                dataLength: tradesResponse.data ? tradesResponse.data.length : 0
            });

            if (tradesResponse.code === 1000 && Array.isArray(tradesResponse.data)) {
                orderTrades = tradesResponse.data;
                console.log(`✅ [getSpotOrder] Found ${orderTrades.length} trades for order ${orderId}`);
                
                // Calculate fees from actual trades
                for (const trade of orderTrades) {
                    const tradeFee = parseFloat(trade.fee || 0);
                    totalFees += tradeFee;
                    
                    console.log(`💰 [getSpotOrder] Trade fee: ${tradeFee} ${trade.feeCoinName || 'USDT'}`);
                    
                if (trade.tradeRole === 'maker') {
                    feeType = 'maker';
                }
                feeCurrency = trade.feeCoinName || feeCurrency;
            }
                
                console.log(`💳 [getSpotOrder] Total fees calculated: ${totalFees} ${feeCurrency} (${feeType})`);
            } else {
                console.warn(`⚠️ [getSpotOrder] Could not get trades for order ${orderId}:`, tradesResponse.message);
            }
        } catch (tradeError) {
            console.error(`❌ [getSpotOrder] Error getting trades for order ${orderId}:`, tradeError.message);
        }

        // 5. Fallback fee estimation if no trades found
        if (orderTrades.length === 0 && orderData.state === 'filled') {
            console.warn(`⚠️ [getSpotOrder] No trades found for filled order ${orderId}, using fallback estimation`);
            
            // Estimate fees based on order type and execution
            const executedValue = parseFloat(orderData.filledNotional || 0);
            const executionSpeed = orderData.updateTime - orderData.createTime;
            
            // Determine fee type based on order characteristics
            if (orderData.type === 'market' || executionSpeed < 1000) {
                feeType = 'taker';
            } else {
                feeType = 'maker';
            }
            
            // Estimate fee rates (you should get actual rates from BitMart)
            const estimatedFeeRate = feeType === 'maker' ? 0.001 : 0.0025; // 0.1% maker, 0.25% taker
            totalFees = executedValue * estimatedFeeRate;
            
            console.log(`💰 [getSpotOrder] Estimated fees: ${totalFees.toFixed(6)} ${feeCurrency} (${feeType})`);
        }

        // 6. Return complete order data
        const result = {
            orderId: orderData.orderId,
            symbol: orderData.symbol,
            state: orderData.state,
            side: orderData.side,
            type: orderData.type,
            originalPrice: orderData.price,
            executionPrice: orderData.priceAvg,
            originalSize: orderData.size,
            filledSize: orderData.filledSize,
            filledNotional: orderData.filledNotional,
            feeType: feeType,
            exchangeFees: totalFees,
            feeCurrency: feeCurrency,
            createTime: orderData.createTime,
            updateTime: orderData.updateTime,
            orderTrades: orderTrades,
            isEstimated: orderTrades.length === 0,
            needsUpdate: parseFloat(orderData.filledSize || 0) > 0
        };

        console.log(`✅ [getSpotOrder] Successfully processed order ${orderId}:`, {
            state: result.state,
            filledSize: result.filledSize,
            executionPrice: result.executionPrice,
            totalFees: result.exchangeFees,
            tradeCount: result.orderTrades.length,
            isEstimated: result.isEstimated
        });

        return result;

    } catch (error) {
        console.error(`❌ [getSpotOrder] Error processing order ${orderId}:`, error);
        return {
            orderId: orderId,
            error: error.message,
            needsUpdate: false
        };
    }
}


async function updateSpotOrder(orderDetails) {
    if (!orderDetails.needsUpdate) {
        console.log(`⏭️ [updateSpotOrder] Order ${orderDetails.orderId} doesn't need update`);
        return null;
    }

    try {
        console.log(`🔄 [updateSpotOrder] Updating order ${orderDetails.orderId} in database...`);
        
        // Get the current order from database to check previous status
        const currentOrder = await SpotOrderHistory.findOne({ orderId: orderDetails.orderId });
        if (!currentOrder) {
            console.error(`❌ [updateSpotOrder] Order ${orderDetails.orderId} not found in database`);
            return null;
        }
        
        const previousStatus = currentOrder.status;
        const userId = currentOrder.user;
        
        console.log(`📊 [updateSpotOrder] Previous status: ${previousStatus}, User: ${userId}`);
        
        // Map BitMart states to your internal status
        const statusMapping = {
            'new': 'pending',
            'partially_filled': 'partial',
            'filled': 'completed',
            'canceled': 'cancelled',
            'partially_canceled': 'partial_cancelled',
            'failed': 'failed'
        };
        
        const newStatus = statusMapping[orderDetails.state] || 'unknown';
        console.log(`📊 [updateSpotOrder] New status: ${newStatus}`);

        // Update the order in database
        const updatedOrder = await SpotOrderHistory.findOneAndUpdate(
            { orderId: orderDetails.orderId },
            {
                $set: {
                    status: newStatus,
                    averageExecutionPrice: parseFloat(orderDetails.executionPrice || 0),
                    executedQuantity: parseFloat(orderDetails.filledSize || 0),
                    exchangeFees: orderDetails.exchangeFees || 0,
                    totalFees: orderDetails.exchangeFees || 0,
                    feeCurrency: orderDetails.feeCurrency || 'USDT',
                    role: orderDetails.feeType || 'taker',
                    trades: orderDetails.orderTrades || [],
                    executedAt: orderDetails.updateTime ? new Date(orderDetails.updateTime) : new Date(),
                    updatedAt: new Date()
                }
            },
            { 
                new: true,
                runValidators: true
            }
        );

        if (!updatedOrder) {
            console.error(`❌ [updateSpotOrder] Failed to update order ${orderDetails.orderId} in database`);
            return null;
        }

        console.log(`✅ [updateSpotOrder] Updated order ${orderDetails.orderId}: ${previousStatus} → ${newStatus}`);

        // Handle balance updates for completed/partial orders
        if ((newStatus === 'completed' || newStatus === 'partial' || newStatus === 'partial_cancelled' || newStatus === 'cancelled') && 
            (previousStatus !== 'completed' && previousStatus !== 'partial' && previousStatus !== 'partial_cancelled' && previousStatus !== 'cancelled')) {

            console.log(`💰 [updateSpotOrder] Processing balance updates for user ${userId}...`);
            
            try {
                await updateSpotBalances(userId, updatedOrder, orderDetails);
            } catch (balanceError) {
                console.error(`❌ [updateSpotOrder] Error updating balances for user ${userId}:`, balanceError);
            }
        }
        
        // Log status changes
        if (newStatus === 'completed') {
            console.log(`🎉 [updateSpotOrder] Order ${orderDetails.orderId} completed!`);
            console.log(`   Filled: ${orderDetails.filledSize} at avg price: ${orderDetails.executionPrice}`);
            console.log(`   Fees: ${orderDetails.exchangeFees} ${orderDetails.feeCurrency}`);
        } else if (newStatus === 'cancelled') {
            console.log(`❌ [updateSpotOrder] Order ${orderDetails.orderId} was cancelled`);
        } else if (newStatus === 'partial') {
            console.log(`⚡ [updateSpotOrder] Order ${orderDetails.orderId} partially filled: ${orderDetails.filledSize}/${orderDetails.originalSize}`);
        } else if (newStatus === 'partial_cancelled') {
            console.log(`⚠️ [updateSpotOrder] Order ${orderDetails.orderId} partially cancelled: ${orderDetails.filledSize}/${orderDetails.originalSize} filled`);
        }

        return updatedOrder;

    } catch (error) {
        console.error(`❌ [updateSpotOrder] Error updating order ${orderDetails.orderId}:`, error);
        throw error;
    }
}

/**
 * Update User's Spot Balances After Order Execution
 * @param {string} userId - User ID
 * @param {Object} order - Updated order document
 * @param {Object} orderDetails - Order details from BitMart
 */
async function updateSpotBalances(userId, order, orderDetails) {
    try {
        console.log(`🔄 [updateSpotBalances] Processing balance update for spot order...`);
        
        // Parse symbol to get base and quote currencies
        const [baseCurrency, quoteCurrency] = orderDetails.symbol.split('_');
        console.log(`📊 [updateSpotBalances] Symbol: ${orderDetails.symbol} (${baseCurrency}/${quoteCurrency})`);
        
        const executedQuantity = parseFloat(orderDetails.filledSize || 0);
        const executionPrice = parseFloat(orderDetails.executionPrice || 0);
        const totalFees = parseFloat(orderDetails.exchangeFees || 0);
        const totalCost = (executedQuantity * executionPrice) + totalFees;
        
        console.log(`💰 [updateSpotBalances] Order details:`);
        console.log(`   Executed Quantity: ${executedQuantity} ${baseCurrency}`);
        console.log(`   Execution Price: ${executionPrice} ${quoteCurrency}`);
        console.log(`   Total Cost: ${totalCost} ${quoteCurrency} (including ${totalFees} fees)`);
        
        // Calculate trading volume (total value of the trade)
        const tradingVolume = executedQuantity * executionPrice;
        console.log(`📈 [updateSpotBalances] Trading volume for this trade: ${tradingVolume} ${quoteCurrency}`);
        
        // Handle BUY orders - Add base currency, deduct quote currency
        if (orderDetails.side === 'buy') {
            console.log(`📈 [updateSpotBalances] Processing BUY order...`);
            
            // 1. Add base currency (e.g., BTC) to user's balance
            await updateSpotBalance(userId, baseCurrency, executedQuantity, 'add');
            
            // 2. Deduct quote currency (e.g., USDT) from user's balance
            await updateSpotBalance(userId, quoteCurrency, totalCost, 'subtract');
            
            // 3. Update trading volume for quote currency (USDT)
            await updateTradingVolume(userId, quoteCurrency, tradingVolume);
            
            console.log(`✅ [updateSpotBalances] BUY order processed:`);
            console.log(`   +${executedQuantity} ${baseCurrency} added to balance`);
            console.log(`   -${totalCost} ${quoteCurrency} deducted from balance`);
            console.log(`   +${tradingVolume} ${quoteCurrency} added to trading volume`);
            
        }
        // Handle SELL orders - Deduct base currency, add quote currency
        else if (orderDetails.side === 'sell') {
            console.log(`📉 [updateSpotBalances] Processing SELL order...`);
            
            // 1. Deduct base currency (e.g., BTC) from user's balance
            await updateSpotBalance(userId, baseCurrency, executedQuantity, 'subtract');
            
            // 2. Add quote currency (e.g., USDT) to user's balance (minus fees)
            const netQuoteReceived = (executedQuantity * executionPrice) - totalFees;
            await updateSpotBalance(userId, quoteCurrency, netQuoteReceived, 'add');
            
            // 3. Update trading volume for quote currency (USDT)
            await updateTradingVolume(userId, quoteCurrency, tradingVolume);
            
            console.log(`✅ [updateSpotBalances] SELL order processed:`);
            console.log(`   -${executedQuantity} ${baseCurrency} deducted from balance`);
            console.log(`   +${netQuoteReceived} ${quoteCurrency} added to balance (after ${totalFees} fees)`);
            console.log(`   +${tradingVolume} ${quoteCurrency} added to trading volume`);
        }
        
        console.log(`🎉 [updateSpotBalances] Balance updates completed successfully!`);
        
    } catch (error) {
        console.error(`❌ [updateSpotBalances] Error updating spot balances:`, error);
        throw error;
    }
}

/**
 * Update individual spot balance for a user
 * @param {string} userId - User ID
 * @param {string} coinName - Coin name (e.g., 'BTC', 'USDT')
 * @param {number} amount - Amount to add/subtract
 * @param {string} operation - 'add' or 'subtract'
 */
async function updateSpotBalance(userId, coinName, amount, operation) {
    try {
        console.log(`🔄 [updateSpotBalance] Updating ${coinName} balance for user ${userId}: ${operation} ${amount}`);
        
        // Find existing balance for this coin
        let balance = await SpotBalance.findOne({ 
            user: userId, 
            coinName: coinName 
        });
        
        if (balance) {
            console.log(`📊 [updateSpotBalance] Current ${coinName} balance: ${balance.balance}`);
            
            // Update existing balance
            if (operation === 'add') {
                balance.balance += amount;
            } else if (operation === 'subtract') {
                balance.balance -= amount;
                
                // Prevent negative balance
                if (balance.balance < 0) {
                    console.warn(`⚠️ [updateSpotBalance] Negative balance detected for ${coinName}: ${balance.balance}`);
                    balance.balance = 0;
                }
            }
            
            balance.updatedAt = new Date();
            await balance.save();
            
            console.log(`✅ [updateSpotBalance] Updated ${coinName} balance: ${balance.balance}`);
            
        } else {
            console.log(`📝 [updateSpotBalance] Creating new balance record for ${coinName}`);
            
            // Create new balance record
            const newBalance = new SpotBalance({
                user: userId,
                coinId: coinName, // Using coinName as coinId since BitMart doesn't have coinId
                coinName: coinName,
                balance: operation === 'add' ? amount : 0,
                currency: coinName,
                chain: 'bitmart', // Default chain
                memo: '',
                createdAt: new Date(),
                updatedAt: new Date()
            });
            
            await newBalance.save();
            
            console.log(`✅ [updateSpotBalance] Created new ${coinName} balance: ${newBalance.balance}`);
        }

    } catch (error) {
        console.error(`❌ [updateSpotBalance] Error updating ${coinName} balance:`, error);
        throw error;
    }
}

/**
 * Update trading volume for a user's specific coin
 * @param {string} userId - User ID
 * @param {string} coinName - Coin name (e.g., 'USDT')
 * @param {number} volume - Trading volume to add
 */
async function updateTradingVolume(userId, coinName, volume) {
    try {
        console.log(`🔄 [updateTradingVolume] Updating ${coinName} trading volume for user ${userId}: +${volume}`);
        
        // Find existing balance for this coin
        let balance = await SpotBalance.findOne({ 
            user: userId, 
            coinName: coinName 
        });
        
        if (balance) {
            console.log(`📊 [updateTradingVolume] Current ${coinName} trading volume: ${balance.tradingVolume || 0}`);
            
            // Update trading volume
            balance.tradingVolume = (balance.tradingVolume || 0) + volume;
            balance.updatedAt = new Date();
            await balance.save();
            
            console.log(`✅ [updateTradingVolume] Updated ${coinName} trading volume: ${balance.tradingVolume}`);
        } else {
            console.warn(`⚠️ [updateTradingVolume] No balance found for ${coinName}, cannot update trading volume`);
        }

    } catch (error) {
        console.error(`❌ [updateTradingVolume] Error updating ${coinName} trading volume:`, error);
        throw error;
    }
}


// ===============================
// 🚀 FUTURES ORDER TRACKING CRONJOB SYSTEM
// Structured like your spot system
// ===============================

/**
 * Get Futures Order Details and Check Status
 * @param {string} orderId - BitMart order ID
 * @param {string} symbol - Trading symbol (e.g., "ETHUSDT")
 * @returns {Promise<Object>} - Updated order data with updateNeeded flag
 */
async function getFuturesOrder(orderId, symbol) {
    try {
        console.log(`🔍 Checking futures order: ${orderId} (${symbol})`);
        
        // 1. Get order details from BitMart
        const orderResponse = await bitmart.getContractOrder(symbol, orderId);
        
        if (orderResponse.code !== 1000) {
            console.log("Order response error:", { code: orderResponse.code, message: orderResponse.message });
            throw new Error(orderResponse.message || 'Unknown error fetching order');
        }

        const orderData = orderResponse.data;
        console.log(`📊 Order ${orderId} state: ${orderData.state}`);

        // 2. Map BitMart states to our status
        const stateMapping = {
            1: 'pending',           // Unfilled
            2: 'partial',           // Partially filled  
            3: 'cancelled',         // Cancelled
            4: 'completed',         // Filled
            5: 'triggered',         // Triggered (plan orders)
            6: 'failed'             // Failed
        };
        
        const newStatus = stateMapping[orderData.state] || 'unknown';
        
        // 3. Check if order needs updating
        const needsUpdate = orderData.state !== 1; // Any state other than pending (1)
        
        // 4. Get execution details if order has been executed
        let executionPrice = parseFloat(orderData.deal_avg_price || orderData.price || 0);
        let executedSize = parseInt(orderData.deal_size || 0);
        let executedValue = executionPrice * executedSize;
        
        // 5. Calculate fees (BitMart futures fees are typically in USDT)
        let totalFees = 0;
        let feeCurrency = 'USDT';
        let feeType = 'taker'; // Default assumption
        
        if (newStatus === 'completed' || newStatus === 'partial') {
            // Estimate fees based on executed value
            // You can get actual fee rates from BitMart or use estimates
            const makerFeeRate = 0.0002;  // 0.02%
            const takerFeeRate = 0.0006;  // 0.06%
            
            // Determine if it was maker or taker based on order type and execution time
            const executionSpeed = orderData.update_time - orderData.create_time;
            
            if (orderData.type === 'market' || executionSpeed < 1000) {
                feeType = 'taker';
                totalFees = executedValue * takerFeeRate;
            } else {
                feeType = 'maker';
                totalFees = executedValue * makerFeeRate;
            }
            
            console.log(`💰 Calculated fees: ${totalFees.toFixed(6)} ${feeCurrency} (${feeType})`);
        }

        // 6. Return complete order data
        return {
            orderId: orderData.order_id,
            symbol: orderData.symbol,
            state: orderData.state,
            status: newStatus,
            side: orderData.side,
            type: orderData.type,
            leverage: orderData.leverage,
            openType: orderData.open_type,
            originalPrice: parseFloat(orderData.price || 0),
            executionPrice: executionPrice,
            originalSize: parseInt(orderData.size || 0),
            executedSize: executedSize,
            executedValue: executedValue,
            feeType: feeType,
            exchangeFees: totalFees,
            feeCurrency: feeCurrency,
            createTime: orderData.create_time,
            updateTime: orderData.update_time,
            updateNeeded: needsUpdate,
            
            // Plan order specific fields (if available)
            activationPrice: parseFloat(orderData.activation_price || 0),
            activationPriceType: orderData.activation_price_type || 0,
            presetTakeProfitPrice: orderData.preset_take_profit_price || null,
            presetStopLossPrice: orderData.preset_stop_loss_price || null,
            planCategory: orderData.plan_category || 0
        };

    } catch (error) {
        console.error(`❌ Error processing futures order ${orderId}:`, error);
        return {
            orderId: orderId,
            symbol: symbol,
            error: error.message,
            updateNeeded: false
        };
    }
}

/**
 * Update Futures Order in Database and Handle Balance Updates
 * @param {Object} orderDetails - Order details from getFuturesOrder
 * @returns {Promise<Object|null>} - Updated order document
 */
async function updateFuturesOrder(orderDetails) {
    if (!orderDetails.updateNeeded) {
        console.log(`⏭️  Order ${orderDetails.orderId} doesn't need update`);
        return null;
    }

    try {
        console.log(`🔄 Updating futures order ${orderDetails.orderId} in database...`);
        
        // Get the current order from database
        const currentOrder = await FuturesOrderHistory.findOne({ orderId: orderDetails.orderId });
        if (!currentOrder) {
            console.error(`❌ Order ${orderDetails.orderId} not found in database`);
            return null;
        }
        
        const previousStatus = currentOrder.status;
        const userId = currentOrder.user;
        
        console.log(`📊 Status change: ${previousStatus} → ${orderDetails.status}`);

        // Update the order in database
        const updatedOrder = await FuturesOrderHistory.findOneAndUpdate(
            { orderId: orderDetails.orderId },
            {
                $set: {
                    status: orderDetails.status,
                    executed_price: orderDetails.executionPrice,
                    executed_quantity: orderDetails.executedSize,
                    executed_value: orderDetails.executedValue,
                    exchange_fees: orderDetails.exchangeFees,
                    total_fees: orderDetails.exchangeFees, // Can add platform fees later
                    fee_currency: orderDetails.feeCurrency,
                    fee_type: orderDetails.feeType,
                    executed_at: orderDetails.updateTime ? new Date(orderDetails.updateTime) : new Date(),
                    updatedAt: new Date(),
                    
                    // Plan order specific updates
                    activation_price: orderDetails.activationPrice,
                    preset_take_profit_price: orderDetails.presetTakeProfitPrice,
                    preset_stop_loss_price: orderDetails.presetStopLossPrice
                }
            },
            { 
                new: true,
                runValidators: true
            }
        );

        if (!updatedOrder) {
            console.error(`❌ Failed to update order ${orderDetails.orderId} in database`);
            return null;
        }

        console.log(`✅ Updated order ${orderDetails.orderId}: ${previousStatus} → ${orderDetails.status}`);

        // Handle balance updates for completed/partial orders
        if ((orderDetails.status === 'completed' || orderDetails.status === 'partial') && 
            (previousStatus !== 'completed' && previousStatus !== 'partial')) {

            console.log(`💰 Updating balances for user ${userId}...`);

            try {
                await updateFuturesBalance(userId, updatedOrder, orderDetails);
            } catch (balanceError) {
                console.error(`❌ Error updating futures balance for user ${userId}:`, balanceError);
            }
        }
        
        // Log execution details
        if (orderDetails.status === 'completed') {
            console.log(`🎉 Futures order ${orderDetails.orderId} completed!`);
            console.log(`   Position: ${getSideText(orderDetails.side)} ${orderDetails.executedSize} contracts`);
            console.log(`   Price: ${orderDetails.executionPrice} USDT`);
            console.log(`   Value: ${orderDetails.executedValue.toFixed(2)} USDT`);
            console.log(`   Leverage: ${orderDetails.leverage}x`);
            console.log(`   Fees: ${orderDetails.exchangeFees.toFixed(6)} ${orderDetails.feeCurrency}`);
        } else if (orderDetails.status === 'triggered') {
            console.log(`⚡ Plan order ${orderDetails.orderId} triggered!`);
        } else if (orderDetails.status === 'cancelled') {
            console.log(`❌ Order ${orderDetails.orderId} was cancelled`);
        } else if (orderDetails.status === 'partial') {
            console.log(`⚡ Order ${orderDetails.orderId} partially filled: ${orderDetails.executedSize}/${orderDetails.originalSize}`);
        }

        return updatedOrder;

    } catch (error) {
        console.error(`❌ Error updating futures order ${orderDetails.orderId}:`, error);
        throw error;
    }
}

/**
 * Update User's Futures Balance After Order Execution
 * @param {string} userId - User ID
 * @param {Object} order - Updated order document
 * @param {Object} orderDetails - Order details from BitMart
 */
async function updateFuturesBalance(userId, order, orderDetails) {
    try {
        console.log(`🔄 Processing balance update for futures order...`);
        
        // Get user's USDT futures balance
        let usdtBalance = await FuturesBalance.findOne({ 
            user: userId, 
            coinId: 1280 // USDT
        });

        if (!usdtBalance) {
            console.error(`❌ USDT futures balance not found for user ${userId}`);
            return;
        }

        const executedValue = orderDetails.executedValue;
        const fees = orderDetails.exchangeFees;
        const leverage = parseFloat(orderDetails.leverage);
        const marginUsed = executedValue / leverage;

        // Calculate trading volume (total value of the trade)
        const tradingVolume = executedValue;
        console.log(`📈 [updateFuturesBalance] Trading volume for this futures trade: ${tradingVolume} USDT`);

        // Determine balance change based on order side
        let balanceChange = 0;
        let description = '';

        switch (orderDetails.side) {
            case 1: // Buy Open Long
                balanceChange = -(marginUsed + fees);
                description = `Opened long position: ${orderDetails.executedSize} contracts at ${orderDetails.executionPrice}`;
                break;
                
            case 2: // Buy Close Short
                balanceChange = -(fees); // Closing position, margin released separately
                description = `Closed short position: ${orderDetails.executedSize} contracts at ${orderDetails.executionPrice}`;
                break;
                
            case 3: // Sell Close Long
                balanceChange = -(fees); // Closing position, margin released separately  
                description = `Closed long position: ${orderDetails.executedSize} contracts at ${orderDetails.executionPrice}`;
                break;
                
            case 4: // Sell Open Short
                balanceChange = -(marginUsed + fees);
                description = `Opened short position: ${orderDetails.executedSize} contracts at ${orderDetails.executionPrice}`;
                break;
                
            default:
                console.warn(`⚠️  Unknown order side: ${orderDetails.side}`);
                balanceChange = -fees; // At minimum, deduct fees
        }

        // Update balance
        const newBalance = usdtBalance.balance + balanceChange;
        
        if (newBalance < 0) {
            console.warn(`⚠️  Negative balance detected for user ${userId}: ${newBalance}`);
        }

        await FuturesBalance.findByIdAndUpdate(usdtBalance._id, {
            balance: Math.max(0, newBalance), // Prevent negative balance
            $inc: { tradingVolume: tradingVolume }, // Add to trading volume
            updatedAt: new Date()
        });

        console.log(`💰 Balance updated for user ${userId}:`);
        console.log(`   Previous: ${usdtBalance.balance.toFixed(6)} USDT`);
        console.log(`   Change: ${balanceChange.toFixed(6)} USDT`);
        console.log(`   New: ${newBalance.toFixed(6)} USDT`);
        console.log(`   Trading Volume Added: ${tradingVolume.toFixed(6)} USDT`);
        console.log(`   Description: ${description}`);

        // TODO: Log transaction history
        // You might want to create a FuturesTransactionHistory entry here

    } catch (error) {
        console.error(`❌ Error updating futures balance:`, error);
        throw error;
    }
}

/**
 * Helper function to get readable side text
 * @param {number} side - Order side number
 * @returns {string} - Readable side text
 */
function getSideText(side) {
    const sideMap = {
        1: 'Buy Open Long',
        2: 'Buy Close Short', 
        3: 'Sell Close Long',
        4: 'Sell Open Short'
    };
    return sideMap[side] || `Side ${side}`;
}


// ===============================
// 🧪 MANUAL TESTING
// ===============================

/**
 * Test single order (for debugging)
 * @param {string} orderId - Order ID to test
 * @param {string} symbol - Trading symbol
 */
async function testSingleFuturesOrder(orderId, symbol) {
    console.log(`🧪 Testing single futures order: ${orderId}`);
    
    try {
        const orderDetails = await getFuturesOrder(orderId, symbol);
        console.log('📊 Order Details:', orderDetails);
        
        if (orderDetails.updateNeeded) {
            const updated = await updateFuturesOrder(orderDetails);
            console.log('✅ Updated Order:', updated);
        }
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// ===============================
// 🧪 DEBUGGING AND TESTING FUNCTIONS
// ===============================

/**
 * Test BitMart API integration for debugging
 * @param {string} orderId - Order ID to test
 */
async function testBitMartOrder(orderId) {
    console.log(`🧪 [TEST] Testing BitMart order: ${orderId}`);
    
    try {
        // Test 1: Get order details
        console.log(`\n📋 [TEST] Step 1: Getting order details...`);
        const orderResponse = await bitmart.getSpotOrder(orderId);
        console.log(`📊 [TEST] Order response:`, JSON.stringify(orderResponse, null, 2));
        
        if (orderResponse.code === 1000 && orderResponse.data) {
            const orderData = orderResponse.data;
            console.log(`✅ [TEST] Order found!`);
            console.log(`   State: ${orderData.state}`);
            console.log(`   Symbol: ${orderData.symbol}`);
            console.log(`   Side: ${orderData.side}`);
            console.log(`   Type: ${orderData.type}`);
            console.log(`   Filled Size: ${orderData.filledSize}`);
            console.log(`   Price Avg: ${orderData.priceAvg}`);
            console.log(`   Create Time: ${new Date(orderData.createTime).toISOString()}`);
            console.log(`   Update Time: ${new Date(orderData.updateTime).toISOString()}`);
            
            // Test 2: Get order trades if order is filled
            if (orderData.state === 'filled' || orderData.state === 'partially_filled') {
                console.log(`\n📋 [TEST] Step 2: Getting order trades...`);
                const tradesResponse = await bitmart.getOrderTrades(orderId);
                console.log(`📊 [TEST] Trades response:`, JSON.stringify(tradesResponse, null, 2));
                
                if (tradesResponse.code === 1000 && Array.isArray(tradesResponse.data)) {
                    console.log(`✅ [TEST] Found ${tradesResponse.data.length} trades`);
                    tradesResponse.data.forEach((trade, index) => {
                        console.log(`   Trade ${index + 1}:`, {
                            tradeId: trade.tradeId,
                            price: trade.price,
                            size: trade.size,
                            fee: trade.fee,
                            role: trade.tradeRole,
                            time: new Date(trade.createTime).toISOString()
                        });
                    });
                } else {
                    console.warn(`⚠️ [TEST] No trades found or invalid response`);
                }
            } else {
                console.log(`⏭️ [TEST] Order not filled, skipping trade lookup`);
            }
            
            // Test 3: Test our getSpotOrder function
            console.log(`\n📋 [TEST] Step 3: Testing getSpotOrder function...`);
            const processedOrder = await getSpotOrder(orderId);
            console.log(`📊 [TEST] Processed order result:`, JSON.stringify(processedOrder, null, 2));
            
        } else {
            console.error(`❌ [TEST] Order not found or error:`, orderResponse.message);
        }
        
    } catch (error) {
        console.error(`❌ [TEST] Test failed:`, error);
    }
}

/**
 * Test multiple orders to check for patterns
 * @param {Array<string>} orderIds - Array of order IDs to test
 */
async function testMultipleOrders(orderIds) {
    console.log(`🧪 [BATCH_TEST] Testing ${orderIds.length} orders...`);
    
    for (const orderId of orderIds) {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`🧪 [BATCH_TEST] Testing order: ${orderId}`);
        console.log(`${'='.repeat(50)}`);
        
        await testBitMartOrder(orderId);
        
        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n✅ [BATCH_TEST] All tests completed`);
}

/**
 * Distribute profits for expired orders (both spot and futures)
 * @returns {Promise<void>}
 */
async function distributeExpiredOrderProfits() {
    try {
        console.log('💰 Starting profit distribution for expired orders...');
        
        // Find all spot orders that have expired and are pending profit distribution
        const expiredSpotOrders = await SpotOrderHistory.find({
            status: 'pending_profit',
            expiration: { $lte: new Date() }
        });

        // Find all futures orders that have expired and are pending profit distribution
        const expiredFuturesOrders = await FuturesOrderHistory.find({
            status: 'pending_profit',
            expiration: { $lte: new Date() }
        });

        console.log(`📋 Found ${expiredSpotOrders.length} expired spot orders to process`);
        console.log(`📋 Found ${expiredFuturesOrders.length} expired futures orders to process`);

        // Process expired spot orders
        for (const order of expiredSpotOrders) {
            try {
                console.log(`\n🔍 Processing expired spot order: ${order.orderId} for user ${order.user}`);
                
                // Get user's current USDT balance
                const usdtBalance = await SpotBalance.findOne({ user: order.user, coinId: "1280" });
                
                if (!usdtBalance) {
                    console.log(`❌ No USDT balance found for user ${order.user}, skipping order`);
                    continue;
                }

                const currentBalance = usdtBalance.balance;
                const profitPercentage = order.percentage;

                // Calculate profit based on current balance * profit percentage
                const profitAmount = currentBalance * (profitPercentage / 100);
                
                console.log(`💰 Current balance: ${currentBalance} USDT, Profit percentage: ${profitPercentage}%, Profit amount: ${profitAmount} USDT`);

                // Update user's USDT balance with the profit
                await SpotBalance.findByIdAndUpdate(usdtBalance._id, {
                    $inc: { balance: profitAmount },
                    updatedAt: new Date()
                });
                console.log(`✅ Added ${profitAmount} USDT profit to user ${order.user}`);

                // Update order status to completed
                await SpotOrderHistory.findByIdAndUpdate(order._id, {
                    status: 'completed',
                    executedAt: new Date(),
                    updatedAt: new Date()
                });

                console.log(`✅ Spot order ${order.orderId} marked as completed with profit: ${profitAmount} USDT`);

            } catch (orderError) {
                console.error(`❌ Error processing expired spot order ${order.orderId}:`, orderError);
                continue; // Continue with next order
            }
        }

        // Process expired futures orders
        for (const order of expiredFuturesOrders) {
            try {
                console.log(`\n🔍 Processing expired futures order: ${order.orderId} for user ${order.user}`);
                
                // Get user's current USDT balance in futures
                const usdtBalance = await FuturesBalance.findOne({ user: order.user, coinId: "1280" });
                
                if (!usdtBalance) {
                    console.log(`❌ No USDT futures balance found for user ${order.user}, skipping order`);
                    continue;
                }

                const currentBalance = usdtBalance.balance;
                const profitPercentage = order.percentage;

                // Calculate profit based on current balance * profit percentage
                const profitAmount = currentBalance * (profitPercentage / 100);

                console.log(`💰 Current futures balance: ${currentBalance} USDT, Profit percentage: ${profitPercentage}%, Profit amount: ${profitAmount} USDT`);

                // Update user's USDT futures balance with the profit
                await FuturesBalance.findByIdAndUpdate(usdtBalance._id, {
                    $inc: { balance: profitAmount },
                    updatedAt: new Date()
                });
                console.log(`✅ Added ${profitAmount} USDT profit to user ${order.user} futures balance`);

                // Update order status to completed
                await FuturesOrderHistory.findByIdAndUpdate(order._id, {
                    status: 'completed',
                    executedAt: new Date(),
                    updatedAt: new Date()
                });

                console.log(`✅ Futures order ${order.orderId} marked as completed with profit: ${profitAmount} USDT`);

            } catch (orderError) {
                console.error(`❌ Error processing expired futures order ${order.orderId}:`, orderError);
                continue; // Continue with next order
            }
        }
        
        console.log('✅ Profit distribution completed for both spot and futures orders');
        
    } catch (error) {
        console.error('❌ Error in profit distribution:', error);
    }
}

module.exports = { createOrUpdateOTP, createOrUpdateResetOTP, generateReferralCdoe, validateVerificationCode,
    updateTradingWallet, getSpotOrder, updateSpotOrder, updateSpotBalances, updateSpotBalance, updateTradingVolume, getFuturesOrder, updateFuturesOrder, testSingleFuturesOrder, testBitMartOrder, testMultipleOrders, distributeExpiredOrderProfits
 };
