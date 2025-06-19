const crypto = require('crypto');
const { Users } = require('../models/users');
const { OTP } = require('../models/otp');
const { Reset_OTP } = require('../models/reset-otp');
const { SpotBalance } = require('../models/spot-balance');
const { FuturesBalance } = require('../models/futures-balance');
const { Transactions } = require('../models/transactions');
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
    const newOtp = new OTP({ email, otp: otpCode });
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
        await bitmart.SpotToFuturesTransfer(currency, amount);
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
    try {
        // 1. Get order details
        const { code: orderCode, message: orderMessage, data: orderData } = await bitmart.getSpotOrder(orderId);
        
        if (orderCode !== 1000) {
            console.log("Order response error:", { code: orderCode, message: orderMessage });
            throw new Error(orderMessage || 'Unknown error fetching order');
        }

        // 2. Check if order needs trade analysis
        if (orderData.state !== 'filled' && orderData.state !== 'partially_filled') {
            return {
                orderId: orderData.orderId,
                state: orderData.state,
                filledSize: orderData.filledSize || '0',
                priceAvg: orderData.priceAvg || '0',
                needsUpdate: false
            };
        }

        // 3. Get account trades around the order execution time to find matching trades
        const orderCreateTime = orderData.createTime;
        const orderUpdateTime = orderData.updateTime;
        
        // Search for trades in a window around order execution
        const searchStartTime = orderCreateTime - 60000; // 1 minute before
        const searchEndTime = orderUpdateTime + 60000;   // 1 minute after
        
        const { code: tradesCode, message: tradesMessage, data: tradesData } = await bitmart.getSpotTrades(
            orderData.symbol,
            'spot',
            searchStartTime,
            searchEndTime,
            50 // Get more trades to find matches
        );

        let matchingTrades = [];
        let totalFees = 0;
        let feeType = 'taker'; // Default
        let feeCurrency = 'USDT';

        if (tradesCode === 1000 && Array.isArray(tradesData) && tradesData.length > 0) {
            // Filter trades that likely belong to this order
            matchingTrades = tradesData.filter(trade => {
                const tradeTime = trade.createTime;
                const tradeSide = trade.side;
                const tradePrice = parseFloat(trade.price);
                const orderPrice = parseFloat(orderData.priceAvg || orderData.price);
                
                // Match criteria:
                // 1. Trade time between order create and update time
                // 2. Same side (buy/sell)
                // 3. Price within reasonable range of order execution price
                const timeMatch = tradeTime >= orderCreateTime && tradeTime <= orderUpdateTime;
                const sideMatch = tradeSide === orderData.side;
                const priceMatch = Math.abs(tradePrice - orderPrice) < (orderPrice * 0.01); // Within 1%
                
                return timeMatch && sideMatch && priceMatch;
            });

            // Calculate fees from matching trades
            for (const trade of matchingTrades) {
                totalFees += parseFloat(trade.fee || 0);
                if (trade.tradeRole === 'maker') {
                    feeType = 'maker';
                }
                feeCurrency = trade.feeCoinName || feeCurrency;
            }
        }

        // 4. Fallback fee estimation if no matching trades found
        if (matchingTrades.length === 0 && orderData.state === 'filled') {
            console.warn(`No matching trades found for order ${orderId}, using fallback estimation`);
            
            // Estimate fees based on order type and timing
            const executionSpeed = orderUpdateTime - orderCreateTime;
            
            // If order executed very quickly (< 1 second), likely a taker
            if (orderData.type === 'market' || executionSpeed < 1000) {
                feeType = 'taker';
            } else {
                feeType = 'maker';
            }
            
            // Estimate fee (you'll need to get actual fee rates)
            const executedValue = parseFloat(orderData.filledNotional || 0);
            const estimatedFeeRate = feeType === 'maker' ? 0.001 : 0.0025; // Example rates
            totalFees = executedValue * estimatedFeeRate;
        }

        // 5. Return complete order data
        return {
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
            matchingTrades: matchingTrades,
            isEstimated: matchingTrades.length === 0,
            needsUpdate: true
        };

    } catch (error) {
        console.error(`Error processing order ${orderId}:`, error);
        return {
            orderId: orderId,
            error: error.message,
            needsUpdate: false
        };
    }
}


async function updateSpotOrder(orderDetails) {
    if (!orderDetails.needsUpdate) {
        console.log(`Order ${orderDetails.orderId} doesn't need update`);
        return null;
    }

    try {
        console.log(`Updating order ${orderDetails.orderId} in database...`);
        
        // Get the current order from database to check previous status
        const currentOrder = await SpotOrderHistory.findOne({ orderId: orderDetails.orderId });
        if (!currentOrder) {
            console.error(`Order ${orderDetails.orderId} not found in database`);
            return null;
        }
        
        const previousStatus = currentOrder.status;
        const userId = currentOrder.user;
        
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
        
        // Get fee information from trades endpoint if order is filled/partial
        let totalFees = 0;
        let feeCurrency = 'USDT';
        let tradeRole = 'taker';
        let trades = [];
        
        if (newStatus === 'completed' || newStatus === 'partial') {
            try {
                console.log(`Getting trade details for order ${orderDetails.orderId}...`);
                
                // Get trades for this specific order
                const tradesResponse = await bitmart.getTrades(orderDetails.symbol);
                
                if (tradesResponse.code === 1000 && Array.isArray(tradesResponse.data)) {
                    // Find trades that match this order ID
                    const orderTrades = tradesResponse.data.filter(trade => 
                        trade.orderId === orderDetails.orderId
                    );
                    
                    console.log(`Found ${orderTrades.length} trades for order ${orderDetails.orderId}`);
                    
                    // Calculate total fees from all trades for this order
                    for (const trade of orderTrades) {
                        totalFees += parseFloat(trade.fee || 0);
                        feeCurrency = trade.feeCoinName || feeCurrency;
                        tradeRole = trade.tradeRole || tradeRole;
                        
                        trades.push({
                            tradeId: trade.tradeId,
                            price: parseFloat(trade.price),
                            quantity: parseFloat(trade.size),
                            fee: parseFloat(trade.fee || 0),
                            role: trade.tradeRole,
                            timestamp: new Date(trade.createTime)
                        });
                    }
                    
                    console.log(`Total fees calculated: ${totalFees} ${feeCurrency}`);
                } else {
                    console.warn(`Could not get trades for order ${orderDetails.orderId}, using estimated fees`);
                    // Fallback: estimate fees based on filled notional
                    const filledValue = parseFloat(orderDetails.filledNotional || 0);
                    const estimatedFeeRate = 0.0025; // 0.25% taker fee estimate
                    totalFees = filledValue * estimatedFeeRate;
                }
            } catch (tradeError) {
                console.warn(`Error getting trades for order ${orderDetails.orderId}:`, tradeError.message);
                // Fallback fee estimation
                const filledValue = parseFloat(orderDetails.filledNotional || 0);
                const estimatedFeeRate = 0.0025;
                totalFees = filledValue * estimatedFeeRate;
            }
        }

        // Update the order in database
        const updatedOrder = await SpotOrderHistory.findOneAndUpdate(
            { orderId: orderDetails.orderId },
            {
                $set: {
                    status: newStatus,
                    averageExecutionPrice: parseFloat(orderDetails.priceAvg || 0),
                    executedQuantity: parseFloat(orderDetails.filledSize || 0),
                    exchangeFees: totalFees,
                    totalFees: totalFees, // Platform fees could be added here if needed
                    feeCurrency: feeCurrency,
                    role: tradeRole,
                    trades: trades,
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
            console.error(`Failed to update order ${orderDetails.orderId} in database`);
            return null;
        }

        console.log(`✅ Updated order ${orderDetails.orderId}: ${previousStatus} → ${newStatus}`);

        // Calculate and update user's profit/loss and balances if order completed/partial
        if ((newStatus === 'completed' || newStatus === 'partial') && 
            (previousStatus !== 'completed' && previousStatus !== 'partial')) {

            console.log(`💰 Calculating profit/loss and balances for user ${userId}...`);

            try {
                // Calculate current balances for this symbol
                const [baseCurrency, quoteCurrency] = orderDetails.symbol.split('_');
                
                // Get all completed orders for this user and symbol
                const allOrders = await SpotOrderHistory.find({
                    user: userId,
                    symbol: orderDetails.symbol,
                    status: { $in: ['completed', 'partial'] }
                }).sort({ createdAt: 1 });
                
                let totalBought = 0;
                let totalBoughtValue = 0;
                let totalSold = 0;
                let totalSoldValue = 0;
                let totalAllFees = 0;
                
                // Calculate totals
                for (const order of allOrders) {
                    const executedValue = order.executedQuantity * order.averageExecutionPrice;
                    totalAllFees += order.totalFees;
                    
                    if (order.side === 'buy') {
                        totalBought += order.executedQuantity;
                        totalBoughtValue += executedValue;
                    } else {
                        totalSold += order.executedQuantity;
                        totalSoldValue += executedValue;
                    }
                }
                
                // Calculate current position and P&L
                const currentPosition = totalBought - totalSold; // How many tokens currently held
                const avgBuyPrice = totalBought > 0 ? totalBoughtValue / totalBought : 0;
                const avgSellPrice = totalSold > 0 ? totalSoldValue / totalSold : 0;
                const realizedPnL = totalSoldValue - (totalSold * avgBuyPrice) - totalAllFees;
                const unrealizedPnL = currentPosition > 0 ? currentPosition * (parseFloat(orderDetails.priceAvg) - avgBuyPrice) : 0;
                const totalPnL = realizedPnL + unrealizedPnL;
                
                // Current balances
                const currentBaseBalance = currentPosition;
                const netQuoteSpent = totalBoughtValue - totalSoldValue + totalAllFees;
                
                console.log(`📊 Trading Summary for ${orderDetails.symbol}:`);
                console.log(`   Current ${baseCurrency} Balance: ${currentBaseBalance.toFixed(8)}`);
                console.log(`   Net ${quoteCurrency} Spent: ${netQuoteSpent.toFixed(8)}`);
                console.log(`   Average Buy Price: ${avgBuyPrice.toFixed(8)}`);
                console.log(`   Average Sell Price: ${avgSellPrice.toFixed(8)}`);
                console.log(`   Total Fees: ${totalAllFees.toFixed(8)} ${quoteCurrency}`);
                console.log(`   Realized P&L: ${realizedPnL.toFixed(8)} ${quoteCurrency}`);
                console.log(`   Unrealized P&L: ${unrealizedPnL.toFixed(8)} ${quoteCurrency}`);
                console.log(`   Total P&L: ${totalPnL.toFixed(8)} ${quoteCurrency} ${totalPnL >= 0 ? '🟢' : '🔴'}`);
                
                // Log this order's impact
                if (newStatus === 'completed') {
                    console.log(`🎉 Order ${orderDetails.orderId} completed!`);
                    console.log(`   Executed: ${updatedOrder.executedQuantity} ${baseCurrency} at ${updatedOrder.averageExecutionPrice} ${quoteCurrency}`);
                    console.log(`   Value: ${(updatedOrder.executedQuantity * updatedOrder.averageExecutionPrice).toFixed(8)} ${quoteCurrency}`);
                    console.log(`   Fees: ${updatedOrder.totalFees.toFixed(8)} ${quoteCurrency}`);
                    
                    if (updatedOrder.side === 'buy') {
                        console.log(`   💳 Bought ${updatedOrder.executedQuantity} ${baseCurrency}`);
                    } else {
                        const profit = (updatedOrder.averageExecutionPrice - avgBuyPrice) * updatedOrder.executedQuantity;
                        console.log(`   💰 Sold ${updatedOrder.executedQuantity} ${baseCurrency}`);
                        console.log(`   Profit from this sale: ${profit.toFixed(8)} ${quoteCurrency} ${profit >= 0 ? '🟢' : '🔴'}`);
                    }
                }
                
            } catch (calcError) {
                console.error(`Error calculating P&L for user ${userId}:`, calcError);
            }
        }
        
        // Log status changes
        if (newStatus === 'completed') {
            console.log(`🎉 Order ${orderDetails.orderId} completed! Filled: ${orderDetails.filledSize} at avg price: ${orderDetails.priceAvg}`);
        } else if (newStatus === 'cancelled') {
            console.log(`❌ Order ${orderDetails.orderId} was cancelled`);
        } else if (newStatus === 'partial') {
            console.log(`⚡ Order ${orderDetails.orderId} partially filled: ${orderDetails.filledSize}/${orderDetails.size}`);
        }

        return updatedOrder;

    } catch (error) {
        console.error(`Error updating order ${orderDetails.orderId}:`, error);
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
            updatedAt: new Date()
        });

        console.log(`💰 Balance updated for user ${userId}:`);
        console.log(`   Previous: ${usdtBalance.balance.toFixed(6)} USDT`);
        console.log(`   Change: ${balanceChange.toFixed(6)} USDT`);
        console.log(`   New: ${newBalance.toFixed(6)} USDT`);
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




module.exports = { createOrUpdateOTP, createOrUpdateResetOTP, generateReferralCdoe, validateVerificationCode,
    updateTradingWallet, getSpotOrder, updateSpotOrder, getFuturesOrder, updateFuturesOrder, testSingleFuturesOrder
 };
 