let mongoose = require('mongoose');

let transactionSchema = new mongoose.Schema({
     userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Users',
            required: false
     },
     type: {
          type: String,
          enum: ['deposit', 'withdrawal', 'internal_transfer', 'deposit_to_spots', 'deposit_to_futures'],
          required: false
     },
     status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
        default: 'pending',
        required: false
     },
     webhookStatus: {
          type: String,
          default: 'pending',
          required: false
     },
     // Ccpayment
     coinId: { type: Number, required: false },
     address: { type: String, required: false },
     chain: { type: String, required: false },
     memo: { type: String, default: '' },
     orderId: { type: String, required: false }, // For deposits from ccpayment
     recordId: { type: String, required: false }, // For withdrawal from ccpayment
     logoUrl: { type: String, default: '' },
     
     // Financial Information
     amount: {
          type: Number,
          required: false,
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