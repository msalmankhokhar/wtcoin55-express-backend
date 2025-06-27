const mongoose = require('mongoose');

const FuturesOrderHistorySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    symbol: { type: String, required: true }, // ETHUSDT, BTCUSDT
    
    // Order Details
    orderId: { type: String, required: false }, // BitMart order ID
    side: { type: String, required: false, default: null }, // buy, sell
    type: { type: String, required: true, enum: ['limit', 'market', 'take_profit', 'stop_loss'] },
    leverage: { type: String, required: true }, // "1", "10", "50"
    open_type: { type: String, required: true, enum: ['cross', 'isolated'] },
    size: { type: Number, required: true }, // Number of contracts
    limit_price: { type: Number, default: 0 }, // Limit price
    expiration: { type: Date, required: false },
    displayExpiration: { type: String, required: false },
    
    // Plan Order Specific Fields
    trigger_price: { type: String, required: true }, // Trigger price
    executive_price: { type: String, required: false }, // Execution price (for limit orders)
    price_way: { type: Number, required: true }, // 1=long, 2=short
    price_type: { type: Number, required: true }, // 1=last_price, 2=fair_price
    
    // Optional Advanced Features
    mode: { type: Number, default: 1 }, // 1=GTC, 2=FOK, 3=IOC, 4=Maker Only
    plan_category: { type: Number, required: false }, // 1=TP/SL, 2=Position TP/SL
    client_order_id: { type: String, required: false },
    
    // Take Profit / Stop Loss
    preset_take_profit_price: { type: String, required: false },
    preset_stop_loss_price: { type: String, required: false },
    preset_take_profit_price_type: { type: Number, required: false }, // 1=last, 2=fair
    preset_stop_loss_price_type: { type: Number, required: false }, // 1=last, 2=fair
    
    // Execution & Status
    status: { type: String, default: 'pending' }, // pending, triggered, completed, cancelled, failed
    executed_price: { type: String, required: false }, // Actual execution price
    executed_quantity: { type: Number, default: 0 }, // Executed contracts
    executed_at: { type: Date, required: false },
    
    // Fees & Costs
    fees: { type: Number, default: 0 },
    total_cost: { type: Number, default: 0 }, // Total margin used
    
    // Copy Trading
    owner: { type: Boolean, required: true, default: false },
    copyCode: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
    percentage: { type: Number, required: false, default: null, min: 0.1, max: 100 },
    
    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Indexes for efficient queries
FuturesOrderHistorySchema.index({ user: 1, createdAt: -1 });
FuturesOrderHistorySchema.index({ orderId: 1 });
FuturesOrderHistorySchema.index({ status: 1 });
FuturesOrderHistorySchema.index({ copyCode: 1 });


const FuturesOrderHistory = mongoose.model('FuturesOrderHistory', FuturesOrderHistorySchema);

module.exports = { FuturesOrderHistory };