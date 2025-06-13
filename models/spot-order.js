const mongoose = require('mongoose');

const SpotOrderFollowerShchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: String, required: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
})

const SpotOrderHistorySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    symbol: { type: String, required: false },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    side: { type: String, enum: ['buy', 'sell'], required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    copyCode: { type: String, required: true},
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    orderId: { type: String, required: false },
    isActive: { type: Boolean, default: true },
    followers: [SpotOrderFollowerShchema]
});

SpotOrderHistorySchema.index({ user: 1 });

const SpotOrderHistory = mongoose.model('SpotOrderHistory', SpotOrderHistorySchema);
module.exports = { SpotOrderHistory };

