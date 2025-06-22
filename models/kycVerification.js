

const mongoose = require('mongoose');

const kycVerificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    fullName: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    idNumber: { type: String, required: true },
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

kycVerificationSchema.index({ user: 1 }, { unique: true });

const kycVerification = mongoose.model('kycVerification', kycVerificationSchema);
module.exports =  { kycVerification };


