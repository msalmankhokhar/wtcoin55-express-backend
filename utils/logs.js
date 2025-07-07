const Logs = require('../models/logs');
const { Users } = require('../models/users');

/**
 * Main logging function
 * @param {Object} options - Logging options
 */
async function logActivity(options) {
    try {
        const {
            req,
            res,
            action,
            description,
            details = {},
            userId = null,
            userEmail = null,
            userRole = 'guest',
            isAdmin = false,
            responseTime = null,
            statusCode = res?.statusCode || 200
        } = options;

        // Extract request information
        const requestInfo = extractRequestInfo(req);
        
        // Create log entry
        const logEntry = new Logs({
            userId,
            userEmail,
            userRole,
            isAdmin,
            method: requestInfo.method,
            endpoint: requestInfo.endpoint,
            fullUrl: requestInfo.fullUrl,
            ipAddress: requestInfo.ipAddress,
            userAgent: requestInfo.userAgent,
            origin: requestInfo.origin,
            requestBody: sanitizeRequestBody(requestInfo.requestBody),
            requestParams: requestInfo.requestParams,
            requestQuery: requestInfo.requestQuery,
            statusCode,
            responseBody: sanitizeResponseBody(res?.body),
            responseTime,
            action,
            description,
            details
        });

        // Analyze for suspicious activity
        await analyzeSuspiciousActivity(logEntry, req);

        // Save the log
        await logEntry.save();

        // Console log for immediate visibility with prominent IP display
        const ipDisplay = requestInfo.ipAddress !== 'unknown' ? `🌐 ${requestInfo.ipAddress}` : '🌐 Unknown IP';
        console.log(`📝 [${action.toUpperCase()}] ${userEmail || 'Guest'} - ${description} - ${statusCode} - ${ipDisplay}`);

        return logEntry;
    } catch (error) {
        console.error('Error logging activity:', error);
        // Log validation errors specifically
        if (error.name === 'ValidationError') {
            console.error('Validation errors:', error.errors);
        }
        // Don't throw error to avoid breaking the main flow
    }
}

/**
 * Get client IP address from request
 */
function getClientIP(req) {
    // Check for X-Forwarded-For header (for proxy/load balancer)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        // X-Forwarded-For can contain multiple IPs, take the first one
        const firstIP = forwardedFor.split(',')[0].trim();
        if (firstIP && firstIP !== 'unknown') {
            return firstIP;
        }
    }
    
    // Check for X-Real-IP header
    const realIP = req.headers['x-real-ip'];
    if (realIP) {
        return realIP;
    }
    
    // Check for CF-Connecting-IP (Cloudflare)
    const cfIP = req.headers['cf-connecting-ip'];
    if (cfIP) {
        return cfIP;
    }
    
    // Use Express.js ip property (if trust proxy is set)
    if (req.ip) {
        return req.ip;
    }
    
    // Fallback to connection remote address
    if (req.connection && req.connection.remoteAddress) {
        return req.connection.remoteAddress;
    }
    
    // Last fallback
    return 'unknown';
}

/**
 * Extract request information
 */
function extractRequestInfo(req) {
    return {
        method: req.method,
        endpoint: req.route?.path || req.path,
        fullUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
        ipAddress: getClientIP(req),
        userAgent: req.get('User-Agent'),
        origin: req.get('Origin'),
        requestBody: req.body,
        requestParams: req.params,
        requestQuery: req.query
    };
}

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeRequestBody(body) {
    if (!body) return null;
    
    const sanitized = { ...body };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey', 'privateKey'];
    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    });
    
    return sanitized;
}

/**
 * Sanitize response body to remove sensitive information
 */
function sanitizeResponseBody(body) {
    if (!body) return null;
    
    const sanitized = { ...body };
    
    // Remove sensitive fields from response
    const sensitiveFields = ['token', 'secret', 'key', 'apiKey', 'privateKey'];
    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    });
    
    return sanitized;
}

/**
 * Analyze for suspicious activity
 */
async function analyzeSuspiciousActivity(logEntry, req) {
    const flags = [];

    // Check for multiple failed logins from same IP
    if (logEntry.action === 'login_failed') {
        const failedAttempts = await Logs.getFailedLoginsByIP(logEntry.ipAddress, 60 * 60 * 1000); // 1 hour
        if (failedAttempts > 5) {
            flags.push('multiple_failed_logins');
        }
    }

    // Check for admin actions from non-admin users
    if (logEntry.action.startsWith('admin_') && !logEntry.isAdmin) {
        flags.push('admin_action_from_non_admin');
    }

    // Check for high value transactions
    if (logEntry.action === 'admin_balance_update' || logEntry.action === 'admin_mass_withdrawal') {
        const amount = logEntry.details?.amount || logEntry.requestBody?.amount;
        if (amount && parseFloat(amount) > 10000) {
            flags.push('high_value_transaction');
        }
    }

    // Check for bulk operations
    if (logEntry.action === 'admin_mass_deposit' || logEntry.action === 'admin_mass_withdrawal') {
        flags.push('bulk_operation');
    }

    // Check for unusual user agent
    if (logEntry.userAgent) {
        const suspiciousAgents = ['curl', 'postman', 'insomnia', 'python', 'wget'];
        const isSuspicious = suspiciousAgents.some(agent => 
            logEntry.userAgent.toLowerCase().includes(agent)
        );
        if (isSuspicious) {
            flags.push('unusual_user_agent');
        }
    }

    // Check for suspicious origin
    if (logEntry.origin) {
        const allowedOrigins = [
            'https://qtex.app',
            'https://www.qtex.app',
            'https://qtrade.exchange',
            'https://www.qtrade.exchange'
        ];
        if (!allowedOrigins.includes(logEntry.origin)) {
            flags.push('suspicious_origin');
        }
    }

    // Mark as suspicious if any flags are present
    if (flags.length > 0) {
        logEntry.isSuspicious = true;
        logEntry.securityFlags = flags;
        console.log(`🚨 SUSPICIOUS ACTIVITY DETECTED: ${logEntry.action} - IP: ${logEntry.ipAddress} - Flags: ${flags.join(', ')}`);
    }
}

/**
 * Log login success
 */
async function logLoginSuccess(req, res, user, responseTime = null) {
    return await logActivity({
        req,
        res,
        action: 'login_success',
        description: `User ${user.email} logged in successfully`,
        details: {
            loginMethod: 'email',
            userAgent: req.get('User-Agent'),
            ipAddress: getClientIP(req)
        },
        userId: user._id,
        userEmail: user.email,
        userRole: user.isAdmin ? 'admin' : 'user',
        isAdmin: user.isAdmin,
        responseTime
    });
}

/**
 * Log login failure
 */
async function logLoginFailure(req, res, email, reason, responseTime = null) {
    return await logActivity({
        req,
        res,
        action: 'login_failed',
        description: `Failed login attempt for ${email}: ${reason}`,
        details: {
            attemptedEmail: email,
            failureReason: reason,
            userAgent: req.get('User-Agent'),
            ipAddress: getClientIP(req)
        },
        userEmail: email,
        userRole: 'guest',
        responseTime
    });
}

/**
 * Log admin action
 */
async function logAdminAction(req, res, action, description, details = {}, responseTime = null) {
    const user = req.user;
    return await logActivity({
        req,
        res,
        action,
        description,
        details,
        userId: user?._id,
        userEmail: user?.email,
        userRole: 'admin',
        isAdmin: true,
        responseTime
    });
}

/**
 * Log user action
 */
async function logUserAction(req, res, action, description, details = {}, responseTime = null) {
    const user = req.user;
    return await logActivity({
        req,
        res,
        action,
        description,
        details,
        userId: user?._id,
        userEmail: user?.email,
        userRole: 'user',
        isAdmin: user?.isAdmin || false,
        responseTime
    });
}

/**
 * Log system error
 */
async function logSystemError(req, res, error, description, details = {}) {
    return await logActivity({
        req,
        res,
        action: 'system_error',
        description,
        details: {
            ...details,
            error: error.message,
            stack: error.stack
        },
        statusCode: 500
    });
}

/**
 * Log security violation
 */
async function logSecurityViolation(req, res, violation, details = {}) {
    return await logActivity({
        req,
        res,
        action: 'security_violation',
        description: `Security violation: ${violation}`,
        details,
        statusCode: 403
    });
}

/**
 * Get logs with filtering
 */
async function getLogs(filters = {}, limit = 100, skip = 0) {
    try {
        const query = {};
        
        if (filters.userRole) query.userRole = filters.userRole;
        if (filters.action) query.action = filters.action;
        if (filters.method) query.method = filters.method;
        if (filters.isSuspicious !== undefined) query.isSuspicious = filters.isSuspicious;
        if (filters.userId) query.userId = filters.userId;
        if (filters.ipAddress) query.ipAddress = filters.ipAddress;
        if (filters.dateFrom) query.createdAt = { $gte: new Date(filters.dateFrom) };
        if (filters.dateTo) query.createdAt = { ...query.createdAt, $lte: new Date(filters.dateTo) };

        const logs = await Logs.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'email firstName lastName');

        const total = await Logs.countDocuments(query);

        return { logs, total };
    } catch (error) {
        console.error('Error getting logs:', error);
        throw error;
    }
}

/**
 * Get activity statistics
 */
async function getActivityStats(timeWindow = 24 * 60 * 60 * 1000) {
    try {
        const cutoffTime = new Date(Date.now() - timeWindow);
        
        const stats = await Logs.aggregate([
            { $match: { createdAt: { $gte: cutoffTime } } },
            {
                $group: {
                    _id: {
                        action: '$action',
                        userRole: '$userRole'
                    },
                    count: { $sum: 1 },
                    avgResponseTime: { $avg: '$responseTime' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const suspiciousCount = await Logs.countDocuments({
            isSuspicious: true,
            createdAt: { $gte: cutoffTime }
        });

        const failedLogins = await Logs.countDocuments({
            action: 'login_failed',
            createdAt: { $gte: cutoffTime }
        });

        return {
            actionStats: stats,
            suspiciousCount,
            failedLogins,
            timeWindow
        };
    } catch (error) {
        console.error('Error getting activity stats:', error);
        throw error;
    }
}

module.exports = {
    logActivity,
    logLoginSuccess,
    logLoginFailure,
    logAdminAction,
    logUserAction,
    logSystemError,
    logSecurityViolation,
    getLogs,
    getActivityStats,
    Logs
}; 