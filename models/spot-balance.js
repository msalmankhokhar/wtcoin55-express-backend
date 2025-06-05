const mongoose = require('mongoose');

const SpotBalanceSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    coinId: { type: Number, required: true },
    coinName: { type: String, required: true },
    balance: { type: Number, default: 0 },
    lockedBalance: { type: Number, default: 0 },
    // logoUrl: { type: String },
    updatedAt: { type: Date, default: Date.now }
});

SpotBalanceSchema.index({ user: 1, coinId: 1 }, { unique: true });

const SpotBalance = mongoose.model('SpotBalance', SpotBalanceSchema);
module.exports = { SpotBalance };
