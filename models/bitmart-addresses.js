const mongoose = require('mongoose');

const BitmartAddressSchema = new mongoose.Schema({
    chain: { type: String, required: true },
    address: { type: String, required: true },
    memo: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});
const Address = mongoose.model('Address', AddressSchema);
module.exports = { Address };