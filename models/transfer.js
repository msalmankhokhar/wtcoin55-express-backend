const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    fromAccount: {
        type: String,
        enum: ['exchange', 'spot', 'futures'],
        required: true
    },
    toAccount: {
        type: String,
        enum: ['exchange', 'spot', 'futures'],
        required: true
    },
    coinId: {
        type: String,
        required: true
    },
    coinName: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    fee: {
        type: Number,
        default: 0
    },
    feeType: {
        type: String,
        enum: ['withdrawal_fee', 'penalty_fee', 'no_fee', ''],
        default: ''
    },
    netAmount: {
        type: Number,
        required: true
    },
    requiredVolume: {
        type: Number,
        default: 0
    },
    currentVolume: {
        type: Number,
        default: 0
    },
    volumeMet: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    transferType: {
        type: String,
        enum: ['exchange_to_trade', 'trade_to_exchange', 'trade_to_trade'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
transferSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('TransferHistory', transferSchema); 