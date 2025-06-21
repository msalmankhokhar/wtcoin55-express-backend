const mongoose = require('mongoose');

const FuturesBalanceSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Users', 
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
    balance: { 
        type: Number, 
        default: 0 
    },
    lockedBalance: { 
        type: Number, 
        default: 0 
    },
    logoUrl: { 
        type: String 
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

FuturesBalanceSchema.index({ user: 1, coinId: 1 }, { unique: true });

// Update the updatedAt field before saving
FuturesBalanceSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const FuturesBalance = mongoose.model('FuturesBalance', FuturesBalanceSchema);
module.exports = FuturesBalance;



