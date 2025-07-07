const mongoose = require('mongoose');

const logsSchema = new mongoose.Schema({
    // User information
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: false // Optional for failed logins
    },
    userEmail: {
        type: String,
        required: false
    },
    userRole: {
        type: String,
        enum: ['admin', 'user', 'guest'],
        required: true
    },
    isAdmin: {
        type: Boolean,
        default: false
    },

    // Request information
    method: {
        type: String,
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        required: true
    },
    endpoint: {
        type: String,
        required: true
    },
    fullUrl: {
        type: String,
        required: true
    },
    ipAddress: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        required: false
    },
    origin: {
        type: String,
        required: false
    },

    // Request details
    requestBody: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    requestParams: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    requestQuery: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },

    // Response information
    statusCode: {
        type: Number,
        required: true
    },
    responseBody: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    responseTime: {
        type: Number, // in milliseconds
        required: false
    },

    // Action details
    action: {
        type: String,
        required: true,
        enum: [
            // Authentication actions
            'login_success',
            'login_failed',
            'login_attempt',
            'logout',
            'register',
            'password_reset',
            'email_verification',
            
            // Admin actions
            'admin_user_management',
            'admin_balance_update',
            'admin_vip_update',
            'admin_withdrawal_approval',
            'admin_withdrawal_decline',
            'admin_kyc_verification',
            'admin_mass_deposit',
            'admin_mass_withdrawal',
            'admin_order_management',
            'admin_transfer_management',
            'admin_system_settings',
            
            // User actions
            'user_profile_update',
            'user_balance_check',
            'user_transaction',
            'user_order_placement',
            'user_withdrawal_request',
            'user_transfer',
            'user_action',
            'user_trading_action',
            'user_withdrawal_action',
            'user_transfer_action',
            
            // System actions
            'system_error',
            'security_violation',
            'rate_limit_exceeded'
        ]
    },
    description: {
        type: String,
        required: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },

    // Security flags
    isSuspicious: {
        type: Boolean,
        default: false
    },
    securityFlags: [{
        type: String,
        enum: [
            'multiple_failed_logins',
            'unusual_ip',
            'unusual_user_agent',
            'admin_action_from_non_admin',
            'high_value_transaction',
            'bulk_operation',
            'suspicious_origin'
        ]
    }],

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for better query performance
logsSchema.index({ userId: 1, createdAt: -1 });
logsSchema.index({ userRole: 1, createdAt: -1 });
logsSchema.index({ action: 1, createdAt: -1 });
logsSchema.index({ method: 1, createdAt: -1 });
logsSchema.index({ statusCode: 1, createdAt: -1 });
logsSchema.index({ isSuspicious: 1, createdAt: -1 });
logsSchema.index({ ipAddress: 1, createdAt: -1 });

// Virtual for formatted timestamp
logsSchema.virtual('formattedTime').get(function() {
    return this.createdAt.toLocaleString();
});

// Method to check if action is admin-related
logsSchema.methods.isAdminAction = function() {
    return this.userRole === 'admin' || this.isAdmin === true;
};

// Method to check if action is suspicious
logsSchema.methods.markAsSuspicious = function(flag) {
    this.isSuspicious = true;
    if (!this.securityFlags.includes(flag)) {
        this.securityFlags.push(flag);
    }
    return this.save();
};

// Static method to get recent suspicious activities
logsSchema.statics.getSuspiciousActivities = function(limit = 50) {
    return this.find({ isSuspicious: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'email firstName lastName');
};

// Static method to get admin activities
logsSchema.statics.getAdminActivities = function(limit = 100) {
    return this.find({ 
        $or: [
            { userRole: 'admin' },
            { isAdmin: true },
            { action: { $regex: /^admin_/ } }
        ]
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'email firstName lastName');
};

// Static method to get login attempts
logsSchema.statics.getLoginAttempts = function(limit = 100) {
    return this.find({
        action: { $in: ['login_success', 'login_failed'] }
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'email firstName lastName');
};

// Static method to get failed login attempts by IP
logsSchema.statics.getFailedLoginsByIP = function(ipAddress, timeWindow = 24 * 60 * 60 * 1000) {
    const cutoffTime = new Date(Date.now() - timeWindow);
    return this.find({
        ipAddress: ipAddress,
        action: 'login_failed',
        createdAt: { $gte: cutoffTime }
    }).count();
};

module.exports = mongoose.model('Logs', logsSchema);
