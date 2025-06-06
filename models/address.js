const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    chain: { type: String, required: true },
    address: { type: String, required: true },
    memo: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});
const Address = mongoose.model('Address', AddressSchema);
module.exports = { Address };