const mongoose = require('mongoose');

const WithdrawalHistorySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    coinId: { type: Number, required: true },
    amount: { type: Number, required: true },
    address: { type: String, required: true },
    chain: { type: String, required: true },
    memo: { type: String, default: '' },
    orderId: { type: String, required: true, unique: true },
    status: { type: String, enum: ['Processing', 'Completed', 'Failed'], default: 'Processing' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const WithdrawalHistory = mongoose.models.WithdrawalHistory || mongoose.model('CryptoWithdrawalHistory', WithdrawalHistorySchema);
module.exports = { WithdrawalHistory }; 