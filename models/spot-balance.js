const mongoose = require('mongoose');

const SpotBalanceSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    coinId: { type: String, required: true },
    coinName: { type: String, required: true },
    balance: { type: Number, default: 0 },
    lockedBalance: { type: Number, default: 0 },
    logoUrl: { type: String },
    requiredVolume: { type: Number, default: 0 },
    tradingVolume: { type: Number, default: 0 },
    currency: { type: String, required: true },
    chain: { type: String, required: true },
    memo: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

SpotBalanceSchema.index({ user: 1, coinId: 1 }, { unique: true });

// Update the updatedAt field before saving
SpotBalanceSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const SpotBalance = mongoose.model('SpotBalance', SpotBalanceSchema);
module.exports = SpotBalance;



