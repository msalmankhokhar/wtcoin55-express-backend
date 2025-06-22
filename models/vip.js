const mongoose = require('mongoose');
// const crypto = require('crypto');

const VipTierSchema = new mongoose.Schema({
    vipName: { type: String, required: true },
    vipLevel: { type: Number, required: true },
    vipStatus: { type: String, required: true },
    vipPercentage: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const VipTier = mongoose.model('VipTier', VipTierSchema);
module.exports = { VipTier };