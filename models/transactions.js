let mongoose = require('mongoose');

let transactionSchema = new mongoose.Schema({
     userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
     },
     reference: {
          type: String,
          required: true,
          unique: true // Ensure references are unique
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
     
     // Financial Information
     amount: {
          type: Number,
          required: true,
          min: 0
     },
     currency: {
          type: String,
          required: true,
          uppercase: true
     },
     fee: {
          type: Number,
          default: 0,
          min: 0
     },
     netAmount: {
          type: Number,
          required: true,
          min: 0
     },
     
     // Transaction Details
     address: {
          type: String,
          required: function() {
               return this.type === 'deposit' || this.type === 'withdrawal';
          }
     },
     addressMemo: {
          type: String,
          default: ''
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
     
     // Error Handling
     failureReason: {
          type: String,
          default: null
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
transactionSchema.index({ reference: 1 });
transactionSchema.index({ externalId: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ txHash: 1 });

// Middleware to update the updatedAt field
transactionSchema.pre('save', function(next) {
     this.updatedAt = new Date();
     
     // Calculate net amount if not provided
     if (!this.netAmount && this.amount) {
          this.netAmount = this.amount - (this.fee || 0);
     }
     
     // Set completedAt when status changes to completed
     if (this.status === 'completed' && !this.completedAt) {
          this.completedAt = new Date();
     }
     
     next();
});

// Instance methods
transactionSchema.methods.markAsCompleted = function(txHash = null, confirmations = 0) {
     this.status = 'completed';
     this.completedAt = new Date();
     if (txHash) this.txHash = txHash;
     if (confirmations) this.confirmations = confirmations;
     return this.save();
};

transactionSchema.methods.markAsFailed = function(reason) {
     this.status = 'failed';
     this.failureReason = reason;
     return this.save();
};

transactionSchema.methods.updateFromBitMart = function(bitmartData) {
     if (bitmartData.id) this.externalId = bitmartData.id;
     if (bitmartData.status) this.externalStatus = bitmartData.status;
     if (bitmartData.tx_id) this.txHash = bitmartData.tx_id;
     if (bitmartData.confirmations) this.confirmations = bitmartData.confirmations;
     
     // Map BitMart status to our status
     switch (bitmartData.status) {
          case 'success':
               this.status = 'completed';
               this.completedAt = this.completedAt || new Date();
               break;
          case 'pending':
               this.status = 'processing';
               break;
          case 'failed':
               this.status = 'failed';
               if (bitmartData.reason) this.failureReason = bitmartData.reason;
               break;
     }
     
     return this.save();
};

// Static methods
transactionSchema.statics.findByReference = function(reference) {
     return this.findOne({ reference: reference });
};

transactionSchema.statics.findByExternalId = function(externalId) {
     return this.findOne({ externalId: externalId });
};

transactionSchema.statics.getUserTransactions = function(userId, type = null, limit = 50) {
     const query = { userId: userId };
     if (type) query.type = type;
     
     return this.find(query)
          .sort({ createdAt: -1 })
          .limit(limit);
};

transactionSchema.statics.getPendingTransactions = function(type = null) {
     const query = { status: { $in: ['pending', 'processing'] } };
     if (type) query.type = type;
     
     return this.find(query);
};

const Transactions = mongoose.model('Transactions', transactionSchema);
module.exports = { Transactions };