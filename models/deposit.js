let mongoose = require('mongoose');

let transactionSchema = new mongoose.Schema({
     userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Users',
            required: true
     },
     reference: {
          type: String,
          required: true
     },
     type: {
          type: String,
          enum: ['deposit', 'withdrawal', 'internal_transfer', 'wallet_transfer'],
          required: true
     },
     status: {
        type: String,
        deault: 'pending',
     },
     createdAt: {
          type: Date,
          default: Date.now
     },
});

const Transactions = mongoose.model('Transactions', transactionSchema);
module.exports = { Transactions }; 
