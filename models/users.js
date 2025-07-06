const mongoose = require('mongoose');
const crypto = require('crypto');

const UsersSchema = new mongoose.Schema({
    email: { type: String, required: false, unique: true, sparse: true },
    password: { type: String, required: true },
    phonenumber: { type: String, required: false, unique: true, sparse: true },
    referBy: { type: String, default: false },
    refCode: {
        type: String,
        default: function() {
            return crypto.randomBytes(6).toString('hex').toUpperCase();
        },
        unique: true
    },
    // totalBalance: { type: Number, default: 0 },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    firstDeposit: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    kycVerification: { type: Boolean, default: false },
    vipTier: { type: mongoose.Schema.Types.ObjectId, ref: 'VipTier', default: null },
    vipLastUpdated: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    lastLogin: {type: Date, required: false},
    isSuspended: {type: Boolean, default: false},
    suspendedAt: {type: Date, required: false},
});

const Users = mongoose.model('Users', UsersSchema);
module.exports = { Users };
