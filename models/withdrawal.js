const mongoose = require('mongoose');

const WithdrawalRequestSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    coinId: { type: Number, required: true },
    coinName: { type: String, required: true },
    amount: { type: Number, required: true },
    address: { type: String, required: true },
    chain: { type: String, required: true },
    memo: { type: String, default: '' },
    walletType: { type: String, enum: ['main', 'spot', 'futures'], default: 'main' },
    
    // Request status
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'declined', 'processing', 'completed', 'failed'], 
        default: 'pending' 
    },
    
    // Admin approval details
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    approvedAt: { type: Date },
    declineReason: { type: String },
    
    // Withdrawal execution details (after approval)
    orderId: { type: String, unique: true, sparse: true },
    recordId: { type: String },
    withdrawalId: { type: String },
    transactionHash: { type: String },
    
    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    processedAt: { type: Date }
});

// Indexes for efficient queries
WithdrawalRequestSchema.index({ user: 1, createdAt: -1 });
WithdrawalRequestSchema.index({ status: 1 });
WithdrawalRequestSchema.index({ createdAt: -1 });

// Legacy withdrawal history schema (for backward compatibility)
const WithdrawalHistorySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    coinId: { type: Number, required: true },
    amount: { type: Number, required: true },
    fee: { type: Number, default: 0 },
    address: { type: String, required: true },
    chain: { type: String, required: true },
    memo: { type: String, default: '' },
    orderId: { type: String, required: true, unique: true },
    status: { type: String, enum: ['Processing', 'Completed', 'Failed'], default: 'Processing' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const WithdrawalRequest = mongoose.models.WithdrawalRequest || mongoose.model('WithdrawalRequest', WithdrawalRequestSchema);
const WithdrawalHistory = mongoose.models.WithdrawalHistory || mongoose.model('CryptoWithdrawalHistory', WithdrawalHistorySchema);

module.exports = { WithdrawalRequest, WithdrawalHistory }; 