const mongoose = require('mongoose');

const adminWalletSchema = new mongoose.Schema({
    coinId: {
        type: String,
        required: true,
        index: true
    },
    coinName: {
        type: String,
        required: true
    },
    currency: {
        type: String,
        required: true
    },
    chain: {
        type: String,
        required: true
    },
    balance: {
        type: Number,
        default: 0,
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
adminWalletSchema.index({ coinId: 1, chain: 1 });

const AdminWallet = mongoose.model('AdminWallet', adminWalletSchema);

module.exports = { AdminWallet }; 