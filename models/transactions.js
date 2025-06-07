let mongoose = require('mongoose');

let transactionSchema = new mongoose.Schema({
     userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Users',
            required: true
     },
     type: {
          type: String,
          enum: ['deposit', 'withdrawal', 'internal_transfer', 'wallet_transfer'],
          required: true
     },
     status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
        default: 'pending',
        required: true
     },

     // Ccpayment
     coinId: { type: Number, required: true },
     address: { type: String, required: true },
     chain: { type: String, required: true },
     memo: { type: String, default: '' },
     orderId: { type: String, required: true, unique: true }, // For deposits from ccpayment
     recordId: { type: String, required: true, unique: true }, // For withdrawal from ccpayment
     logoUrl: { type: String, default: '' },
     
     // Financial Information
     amount: {
          type: Number,
          required: true,
          min: 0
     },
     currency: {
          type: String,
          required: false,
          uppercase: true
     },
     fee: {
          type: Number,
          default: 0,
          min: 0
     },

     txHash: {
          type: String,
          default: null
     },
     confirmations: {
          type: Number,
          default: 0
     },
     
     // External System Integration
     externalId: {
          type: String,
          default: null // BitMart transaction ID
     },
     externalStatus: {
          type: String,
          default: null // Status from BitMart
     },
     
     // Additional Information
     notes: {
          type: String,
          default: ''
     },
     
     // Timestamps
     createdAt: {
          type: Date,
          default: Date.now
     },
     updatedAt: {
          type: Date,
          default: Date.now
     },
     completedAt: {
          type: Date,
          default: null
     },
     
     // For internal transfers
     fromUserId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: function() {
               return this.type === 'internal_transfer';
          }
     },
     toUserId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: function() {
               return this.type === 'internal_transfer';
          }
     }
});

// Indexes for better query performance
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ orderId: 1 });
transactionSchema.index({ recordId: 1 });
transactionSchema.index({ externalId: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ txHash: 1 });


const Transactions = mongoose.model('Transactions', transactionSchema);
module.exports = { Transactions };