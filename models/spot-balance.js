const mongoose = require('mongoose');

const SpotBalanceSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    coinId: { type: String, required: true },
    coinName: { type: String, required: false },
    balance: { type: Number, default: 0 },
    currency: { type: String, required: true },
    chain: { type: String, required: true },
    memo: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

SpotBalanceSchema.index({ user: 1, coinId: 1 }, { unique: true });

const SpotBalance = mongoose.model('SpotBalance', SpotBalanceSchema);
module.exports = { SpotBalance };



