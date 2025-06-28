const mongoose = require('mongoose');

const tradingVolumeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        unique: true,
        required: true
    },
    coinId: {
        type: String,
        required: true
    },
    coinName: {
        type: String,
        required: false
    },
    totalTradingVolume: {
        type: Number,
        default: 0,
        required: true
    },
    requiredVolume: {
        type: Number,
        default: 0,
        required: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index to ensure unique user-coin combinations
tradingVolumeSchema.index({ user: 1, coinId: 1 }, { unique: true });

// Index for efficient queries
tradingVolumeSchema.index({ user: 1 });
tradingVolumeSchema.index({ coinId: 1 });

const TradingVolume = mongoose.model('TradingVolume', tradingVolumeSchema);

module.exports = TradingVolume; 