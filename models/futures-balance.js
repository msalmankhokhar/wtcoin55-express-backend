const mongoose = require('mongoose');

const FuturesBalanceSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    coinId: { type: Number, required: true },
    coinName: { type: String, required: true },
    balance: { type: Number, default: 0 },
    lockedBalance: { type: Number, default: 0 },
    // logoUrl: { type: String },
    updatedAt: { type: Date, default: Date.now }
});

FuturesBalanceSchema.index({ user: 1, coinId: 1 }, { unique: true });

FuturesBalance =  mongoose.model('FuturesBalance', FuturesBalanceSchema);
module.exports = { FuturesBalance };



