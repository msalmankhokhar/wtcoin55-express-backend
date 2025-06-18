

const mongoose = require('mongoose');

const MainBalanceSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    coinId: { type: Number, required: true },
    coinName: { type: String, required: true },
    balance: { type: Number, default: 0 },
    lockedBalance: { type: Number, default: 0 },
    logoUrl: { type: String },
    updatedAt: { type: Date, default: Date.now }
});

MainBalanceSchema.index({ user: 1, coinId: 1 }, { unique: true });

const MainBalance = mongoose.model('MainBalance', MainBalanceSchema);
module.exports =  { MainBalance };


