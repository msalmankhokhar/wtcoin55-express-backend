const { logActivity, logSystemError, logSecurityViolation } = require('../utils/logs');

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
 * Middleware to log all requests and responses
 */
function requestLogger(req, res, next) {
    const startTime = Date.now();
    
    // Store original send method
    const originalSend = res.send;
    const originalJson = res.json;
    
    // Override send method to capture response
    res.send = function(data) {
        res.body = data;
        originalSend.call(this, data);
    };
    
    // Override json method to capture response
    res.json = function(data) {
        res.body = data;
        originalJson.call(this, data);
    };
    
    // Log when response is finished
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        
        // Determine action based on route and method
        const action = determineAction(req);
        
        // Only log if it's a meaningful action
        if (action) {
            logActivity({
                req,
                res,
                action,
                description: `${req.method} ${req.path}`,
                details: {
                    responseTime,
                    userAgent: req.get('User-Agent'),
                    ipAddress: getClientIP(req)
                },
                userId: req.user?._id,
                userEmail: req.user?.email,
                userRole: req.user ? (req.user.isAdmin ? 'admin' : 'user') : 'guest',
                isAdmin: req.user?.isAdmin || false,
                responseTime
            });
        }
    });
    
    next();
}

/**
 * Determine the action type based on request
 */
function determineAction(req) {
    const { method, path } = req;
    
    // Authentication actions
    if (path.includes('/auth/login') && method === 'POST') {
        return 'login_attempt';
    }
    if (path.includes('/auth/register') && method === 'POST') {
        return 'register';
    }
    
    // Admin actions
    if (path.includes('/admin/') && req.user?.isAdmin) {
        if (path.includes('/users') && method === 'GET') return 'admin_user_management';
        if (path.includes('/balance') && method === 'PUT') return 'admin_balance_update';
        if (path.includes('/vip') && method === 'PUT') return 'admin_vip_update';
        if (path.includes('/withdrawal') && method === 'PUT') return 'admin_withdrawal_approval';
        if (path.includes('/kyc') && method === 'PUT') return 'admin_kyc_verification';
        if (path.includes('/mass-deposit') && method === 'POST') return 'admin_mass_deposit';
        if (path.includes('/mass-withdrawal') && method === 'POST') return 'admin_mass_withdrawal';
        if (path.includes('/orders') && method === 'GET') return 'admin_order_management';
        if (path.includes('/transfers') && method === 'GET') return 'admin_transfer_management';
        return 'admin_action';
    }
    
    // User actions
    if (path.includes('/user/') && req.user) {
        if (path.includes('/profile') && method === 'PUT') return 'user_profile_update';
        if (path.includes('/balance') && method === 'GET') return 'user_balance_check';
        if (path.includes('/transactions') && method === 'GET') return 'user_transaction';
        return 'user_action';
    }
    
    // Trading actions
    if (path.includes('/trades/') && req.user) {
        if (path.includes('/follow-order') && method === 'POST') return 'user_order_placement';
        return 'user_trading_action';
    }
    
    // Withdrawal actions
    if (path.includes('/withdrawal/') && req.user) {
        if (method === 'POST') return 'user_withdrawal_request';
        return 'user_withdrawal_action';
    }
    
    // Transfer actions
    if (path.includes('/transfer/') && req.user) {
        if (method === 'POST') return 'user_transfer';
        return 'user_transfer_action';
    }
    
    // Don't log basic GET requests unless they're admin/user specific
    if (method === 'GET' && !path.includes('/admin/') && !path.includes('/user/')) {
        return null;
    }
    
    return 'general_action';
}

/**
 * Middleware to log errors
 */
function errorLogger(err, req, res, next) {
    logSystemError(req, res, err, `Error in ${req.method} ${req.path}`, {
        errorType: err.name,
        errorCode: err.code
    });
    
    next(err);
}

/**
 * Middleware to log security violations
 */
function securityLogger(req, res, next) {
    // Log blocked requests
    if (res.statusCode === 403) {
        logSecurityViolation(req, res, 'Access denied', {
            reason: 'Security policy violation',
            userAgent: req.get('User-Agent'),
            origin: req.get('Origin'),
            ipAddress: getClientIP(req)
        });
    }
    
    next();
}

module.exports = {
    requestLogger,
    errorLogger,
    securityLogger
}; 