const mongoose = require('mongoose');

const SpotOrderHistorySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    symbol: { type: String, required: false },
    quantity: { type: Number, required: true },
    executedQuantity: { type: Number, default: 0 },
    owner: { type: Boolean, required: true, default: false },
    type: { type: String, required: true, enum: ['limit', 'market', 'limit_maker', 'ioc'] },
    role: { type: String, required: true, enum: ['maker', 'taker', 'pending', 'admin', 'follower'] },
    price: { type: Number, required: true },
    averageExecutionPrice: { type: Number, default: 0 },
    side: { type: String, enum: ['buy', 'sell'], required: true },
    status: { type: String, default: 'pending', enum: ['pending', 'completed', 'cancelled', 'partial', 'partial_cancelled', 'failed', 'pending_profit'] },
    copyCode: { type: String, required: true, unique: true },
    expiration: { type: Date, required: false },
    displayExpiration: { type: String, required: false },
    percentage: { type: Number, default: 1, min: 0.1, max: 100 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    executedAt: { type: Date },
    
    // Order IDs
    orderId: { type: String, required: false },
    
    // Fee Information
    exchangeFees: { type: Number, default: 0 }, // Fees paid to BitMart
    platformFees: { type: Number, default: 0 }, // Your platform's fees
    totalFees: { type: Number, default: 0 }, // Total fees
    feeCurrency: { type: String, default: 'USDT' }, // Currency in which fees were paid
    
    // Execution Details
    trades: [{
        tradeId: String,
        price: Number,
        quantity: Number,
        fee: Number,
        role: { type: String, enum: ['maker', 'taker'] },
        timestamp: Date
    }],

    // Copy Trading
    isActive: { type: Boolean, default: true },
    
    // Additional tracking
    marketConditions: {
        bidPrice: Number,
        askPrice: Number,
        spread: Number,
        timestamp: Date
    }
});

// Index for efficient queries
SpotOrderHistorySchema.index({ user: 1, createdAt: -1 });
SpotOrderHistorySchema.index({ copyCode: 1 });
SpotOrderHistorySchema.index({ status: 1 });

module.exports = { SpotOrderHistory: mongoose.model('SpotOrderHistory', SpotOrderHistorySchema) };