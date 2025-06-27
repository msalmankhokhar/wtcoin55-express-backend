const express = require('express');
const { 
    submitSpotOrder, 
    submitFuturesOrder,
    getAllOrders, 
    getAllFuturesOrders,
    getAvailableOrders, 
    getAvailableFuturesOrders,
    makeUserAdmin, 
    removeAdmin, 
    getAllUsers,
    getAllWithdrawalRequests,
    approveWithdrawalRequest,
    declineWithdrawalRequest,
    getOrderDetails,
    getAllTransfers,
    getTransferStats,
    getUserTransferDetails,
    kycVerification,
    getKycVerification,
    getUserBalance,
    updateUserBalance,
    updateUserVipTier,
    getVipTier,
    addVipTier,
    updateVipTier,
    deleteVipTier,
    updateRefCodesToSevenChars,
    massDeposit,
    massWithdrawal,
    getTotalBalance,
    getAdminWalletBalances,
    resetAllUsersVipLevel,
    getDepositHistory,
    getWithdrawalHistory
} = require('../controllers/admin');
const { adminTokenRequired } = require('../middleware/auth');

const router = express.Router();
const tokenRequired = adminTokenRequired;

/**
 * @swagger
 * /api/admin/spot-order:
 *   post:
 *     summary: Submit real spot order (admin only)
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - symbol
 *               - side
 *               - type
 *             properties:
 *               symbol:
 *                 type: string
 *               side:
 *                 type: string
 *                 enum: [buy, sell]
 *               type:
 *                 type: string
 *                 enum: [limit, market]
 *               price:
 *                 type: number
 *               quantity:
 *                 type: number
 *               limit_price:
 *                 type: number
 *                 default: 0
 *                 description: Limit price for the order
 *               notional:
 *                 type: number
 *               expiration:
 *                 type: string
 *                 description: Order expiration time. Supports relative format (e.g., "5m", "10m", "1h", "2d") or absolute ISO date-time format
 *                 example: "5m"
 *                 oneOf:
 *                   - pattern: '^\d+[mhd]$'
 *                     description: Relative time format (minutes, hours, days)
 *                     examples:
 *                       "5m": "5 minutes from now"
 *                       "10m": "10 minutes from now"
 *                       "1h": "1 hour from now"
 *                       "2d": "2 days from now"
 *                   - format: date-time
 *                     description: Absolute ISO date-time format
 *                     example: "2025-06-25T11:00:00.000Z"
 *               displayExpiration:
 *                 type: string
 *                 description: Display expiration time. Supports absolute ISO date-time format
 *                 example: "2025-06-25T11:00:00.000Z"
 *                 format: date-time
 *               percentage:
 *                 type: number
 *                 minimum: 0.1
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: Order submitted successfully
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.post('/spot-order', tokenRequired, submitSpotOrder);

/**
 * @swagger
 * /api/admin/futures-order:
 *   post:
 *     summary: Submit real futures order (admin only)
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - symbol
 *               - side
 *               - type
 *               - size
 *               - trigger_price
 *             properties:
 *               symbol:
 *                 type: string
 *                 description: Trading pair symbol (e.g., BTCUSDT)
 *               side:
 *                 type: string
 *                 description: Order side (buy, sell)
 *               type:
 *                 type: string
 *                 enum: [limit, market, take_profit, stop_loss]
 *               leverage:
 *                 type: string
 *                 default: "10"
 *                 description: Leverage as string
 *               open_type:
 *                 type: string
 *                 enum: [cross, isolated]
 *                 default: "cross"
 *               size:
 *                 type: number
 *                 description: Number of contracts
 *               limit_price:
 *                 type: number
 *                 default: 0
 *                 description: Limit price for the order
 *               trigger_price:
 *                 type: string
 *                 description: Trigger price for the order
 *               executive_price:
 *                 type: string
 *                 description: Execution price (for limit orders)
 *               price_way:
 *                 type: number
 *                 description: 1=long, 2=short
 *               price_type:
 *                 type: number
 *                 default: 1
 *                 description: 1=last_price, 2=fair_price
 *               expiration:
 *                 type: string
 *                 description: Order expiration time. Supports relative format (e.g., "5m", "10m", "1h", "2d") or absolute ISO date-time format
 *                 example: "5m"
 *                 oneOf:
 *                   - pattern: '^\d+[mhd]$'
 *                     description: Relative time format (minutes, hours, days)
 *                     examples:
 *                       "5m": "5 minutes from now"
 *                       "10m": "10 minutes from now"
 *                       "1h": "1 hour from now"
 *                       "2d": "2 days from now"
 *                   - format: date-time
 *                     description: Absolute ISO date-time format
 *                     example: "2025-06-25T11:00:00.000Z"
 *     responses:
 *       200:
 *         description: Futures order submitted successfully
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.post('/futures-order', tokenRequired, submitFuturesOrder);

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: Get all orders (admin only)
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: All orders retrieved successfully
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.get('/orders', tokenRequired, getAllOrders);

/**
 * @swagger
 * /api/admin/futures-orders:
 *   get:
 *     summary: Get all futures orders (admin only)
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: All futures orders retrieved successfully
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.get('/futures-orders', tokenRequired, getAllFuturesOrders);

/**
 * @swagger
 * /api/admin/available-orders:
 *   get:
 *     summary: Get available orders for following (admin only)
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, cancelled, partial, partial_cancelled, failed, pending_profit]
 *         required: false
 *         description: Filter orders by status. Default is 'pending'
 *     responses:
 *       200:
 *         description: Available orders retrieved successfully
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.get('/available-orders', tokenRequired, getAvailableOrders);

/**
 * @swagger
 * /api/admin/available-futures-orders:
 *   get:
 *     summary: Get available futures orders for following (admin only)
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, cancelled, partial, partial_cancelled, failed, pending_profit]
 *         required: false
 *         description: Filter futures orders by status. Default is 'pending'
 *     responses:
 *       200:
 *         description: Available futures orders retrieved successfully
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.get('/available-futures-orders', tokenRequired, getAvailableFuturesOrders);

/**
 * @swagger
 * /api/admin/make-admin:
 *   post:
 *     summary: Make user admin (admin only)
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User made admin successfully
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.post('/make-admin', tokenRequired, makeUserAdmin);

/**
 * @swagger
 * /api/admin/remove-admin:
 *   post:
 *     summary: Remove admin privileges (admin only)
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin privileges removed successfully
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.post('/remove-admin', tokenRequired, removeAdmin);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (admin only)
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: All users retrieved successfully
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.get('/users', tokenRequired, getAllUsers);

/**
 * @swagger
 * /api/admin/withdrawal-requests:
 *   get:
 *     summary: Get all withdrawal requests (admin only)
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: All withdrawal requests retrieved successfully
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.get('/withdrawal-requests', tokenRequired, getAllWithdrawalRequests);

/**
 * @swagger
 * /api/admin/withdrawal-requests/:requestId/approve:
 *   post:
 *     summary: Approve withdrawal request (admin only)
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: Withdrawal request ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Withdrawal request approved successfully
 *       400:
 *         description: Bad request - invalid request ID format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid request ID format. Expected a valid MongoDB ObjectId."
 *                 receivedId:
 *                   type: string
 *                   example: ":requestId"
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Withdrawal request not found
 *       500:
 *         description: Server error
 */
router.post('/withdrawal-requests/:requestId/approve', tokenRequired, approveWithdrawalRequest);

/**
 * @swagger
 * /api/admin/withdrawal-requests/:requestId/decline:
 *   post:
 *     summary: Decline withdrawal request (admin only)
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: Withdrawal request ID
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for declining the request
 *                 example: "Insufficient documentation provided"
 *     responses:
 *       200:
 *         description: Withdrawal request declined successfully
 *       400:
 *         description: Bad request - invalid request ID format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid request ID format. Expected a valid MongoDB ObjectId."
 *                 receivedId:
 *                   type: string
 *                   example: ":requestId"
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Withdrawal request not found
 *       500:
 *         description: Server error
 */
router.post('/withdrawal-requests/:requestId/decline', tokenRequired, declineWithdrawalRequest);

/**
 * @swagger
 * /api/admin/order-details:
 *   post:
 *     summary: Get detailed information about a specific order (admin only)
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: The order ID to get details for
 *     responses:
 *       200:
 *         description: Order details retrieved successfully
 *       400:
 *         description: Order ID is required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.post('/order-details', tokenRequired, getOrderDetails);

/**
 * @swagger
 * /api/admin/transfers:
 *   get:
 *     summary: Get all transfer history (admin only)
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed]
 *         description: Filter by transfer status
 *       - in: query
 *         name: transferType
 *         schema:
 *           type: string
 *           enum: [exchange_to_trade, trade_to_exchange]
 *         description: Filter by transfer type
 *       - in: query
 *         name: coinId
 *         schema:
 *           type: string
 *         description: Filter by coin ID
 *     responses:
 *       200:
 *         description: Transfer history retrieved successfully
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.get('/transfers', tokenRequired, getAllTransfers);

/**
 * @swagger
 * /api/admin/transfer-stats:
 *   get:
 *     summary: Get transfer statistics (admin only)
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *           default: 30d
 *         description: Time period for statistics
 *     responses:
 *       200:
 *         description: Transfer statistics retrieved successfully
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.get('/transfer-stats', tokenRequired, getTransferStats);

/**
 * @swagger
 * /api/admin/user-transfers/:userId:
 *   get:
 *     summary: Get user transfer details (admin only)
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "507f1f77bcf86cd799439012"
 *       - in: query
 *         name: coinId
 *         schema:
 *           type: string
 *         description: Filter by coin ID
 *         example: "1280"
 *       - in: query
 *         name: accountType
 *         schema:
 *           type: string
 *           enum: [spot, futures]
 *         description: Filter by account type
 *         example: "spot"
 *     responses:
 *       200:
 *         description: User transfer details retrieved successfully
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.get('/user-transfers/:userId', tokenRequired, getUserTransferDetails);

/**
 * @swagger
 * /api/admin/kyc-verifications:
 *   get:
 *     summary: Get all KYC verification submissions (admin only)
 *     description: Retrieve all KYC verification submissions with user details. This endpoint allows admins to view and review all pending, approved, and rejected KYC applications.
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter KYC verifications by status
 *         example: "pending"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *         example: 20
 *     responses:
 *       200:
 *         description: KYC verification data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: KYC verification record ID
 *                         example: "507f1f77bcf86cd799439011"
 *                       user:
 *                         type: object
 *                         description: User information
 *                         properties:
 *                           _id:
 *                             type: string
 *                             description: User ID
 *                             example: "507f1f77bcf86cd799439012"
 *                           email:
 *                             type: string
 *                             description: User email
 *                             example: "john.smith@example.com"
 *                           firstName:
 *                             type: string
 *                             description: User first name
 *                             example: "John"
 *                           lastName:
 *                             type: string
 *                             description: User last name
 *                             example: "Smith"
 *                       fullName:
 *                         type: string
 *                         description: Full legal name as submitted
 *                         example: "John Michael Smith"
 *                       city:
 *                         type: string
 *                         description: City of residence
 *                         example: "New York"
 *                       country:
 *                         type: string
 *                         description: Country of residence
 *                         example: "United States"
 *                       idNumber:
 *                         type: string
 *                         description: Government-issued identification number
 *                         example: "123456789"
 *                       status:
 *                         type: string
 *                         enum: [pending, approved, rejected]
 *                         description: Current status of the KYC verification
 *                         example: "pending"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: When the KYC was submitted
 *                         example: "2024-01-15T10:30:00.000Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: When the KYC was last updated
 *                         example: "2024-01-15T10:30:00.000Z"
 *                 count:
 *                   type: integer
 *                   description: Total number of KYC verifications returned
 *                   example: 25
 *             example:
 *               success: true
 *               data:
 *                 - _id: "507f1f77bcf86cd799439011"
 *                   user:
 *                     _id: "507f1f77bcf86cd799439012"
 *                     email: "john.smith@example.com"
 *                     firstName: "John"
 *                     lastName: "Smith"
 *                   fullName: "John Michael Smith"
 *                   city: "New York"
 *                   country: "United States"
 *                   idNumber: "123456789"
 *                   status: "pending"
 *                   createdAt: "2024-01-15T10:30:00.000Z"
 *                   updatedAt: "2024-01-15T10:30:00.000Z"
 *                 - _id: "507f1f77bcf86cd799439013"
 *                   user:
 *                     _id: "507f1f77bcf86cd799439014"
 *                     email: "maria.garcia@example.com"
 *                     firstName: "Maria"
 *                     lastName: "Garcia"
 *                   fullName: "Maria García López"
 *                   city: "Madrid"
 *                   country: "Spain"
 *                   idNumber: "ES12345678A"
 *                   status: "approved"
 *                   createdAt: "2024-01-14T15:45:00.000Z"
 *                   updatedAt: "2024-01-15T09:20:00.000Z"
 *               count: 2
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Only admins can view KYC verification data"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to get KYC verification data"
 */
router.get('/kyc-verifications', tokenRequired, getKycVerification);

/**
 * @swagger
 * /api/admin/kyc-verification/{kycId}:
 *   put:
 *     summary: Update KYC verification status (admin only)
 *     description: Approve or reject a user's KYC verification submission. This endpoint allows admins to review and process KYC applications for compliance purposes.
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: kycId
 *         required: true
 *         schema:
 *           type: string
 *         description: KYC verification record ID
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *                 description: The new status for the KYC verification
 *                 example: "approved"
 *           examples:
 *             approve:
 *               summary: Approve KYC verification
 *               value:
 *                 status: "approved"
 *             reject:
 *               summary: Reject KYC verification
 *               value:
 *                 status: "rejected"
 *     responses:
 *       200:
 *         description: KYC verification status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "KYC verification updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     kycId:
 *                       type: string
 *                       description: The KYC verification record ID
 *                       example: "507f1f77bcf86cd799439011"
 *                     status:
 *                       type: string
 *                       enum: [approved, rejected]
 *                       description: The updated status
 *                       example: "approved"
 *                     fullName:
 *                       type: string
 *                       description: Full name of the user
 *                       example: "John Michael Smith"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp of the update
 *                       example: "2024-01-15T10:30:00.000Z"
 *             example:
 *               success: true
 *               message: "KYC verification updated successfully"
 *               data:
 *                 kycId: "507f1f77bcf86cd799439011"
 *                 status: "approved"
 *                 fullName: "John Michael Smith"
 *                 updatedAt: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   oneOf:
 *                     - "Invalid KYC verification ID format"
 *                     - "Invalid status. Must be either \"approved\" or \"rejected\""
 *                     - "KYC verification has already been processed"
 *             examples:
 *               invalidId:
 *                 summary: Invalid KYC ID format
 *                 value:
 *                   success: false
 *                   error: "Invalid KYC verification ID format"
 *               invalidStatus:
 *                 summary: Invalid status value
 *                 value:
 *                   success: false
 *                   error: "Invalid status. Must be either \"approved\" or \"rejected\""
 *               alreadyProcessed:
 *                 summary: KYC already processed
 *                 value:
 *                   success: false
 *                   error: "KYC verification has already been processed"
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Only admins can update KYC verification"
 *       404:
 *         description: KYC verification not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "KYC verification not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to update KYC verification"
 */
router.put('/kyc-verification/:kycId', tokenRequired, kycVerification);

/**
 * @swagger
 * /api/admin/users/{userId}/balance:
 *   patch:
 *     summary: Update user balance
 *     description: Update user balance
 *     tags: [Admin]
 *     security:
 *       - quantumAccessToken: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newBalance:
 *                 type: number
 *                 required: true
 *                 description: New balance
 *               destination:
 *                 type: string
 *                 required: false
 *                 description: Destination of the balance (main, spot, futures)
 *                 enum: [main, spot, futures]
 *                 default: main
 *     responses:
 *       200:
 *         description: User balance updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 *       500:
 *         description: Failed to update user balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 */
router.patch('/users/:userId/balance', tokenRequired, updateUserBalance);

/**
 * @swagger
 * /api/admin/users/balance:
 *   get:
 *     summary: Get user balance(s)
 *     description: Get balance for a specific user or all users if no userId provided
 *     tags: [Admin]
 *     security:
 *       - quantumAccessToken: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         required: false
 *         description: User ID (optional - if not provided, returns all users' balances)
 *     responses:
 *       200:
 *         description: User balance data
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Single user balance response
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     data:
 *                       type: object
 *                       properties:
 *                         main:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               balance:
 *                                 type: number
 *                               coinId:
 *                                 type: string
 *                               user:
 *                                 type: string
 *                         spot:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               balance:
 *                                 type: number
 *                               coinId:
 *                                 type: string
 *                               user:
 *                                 type: string
 *                         futures:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               balance:
 *                                 type: number
 *                               coinId:
 *                                 type: string
 *                               user:
 *                                 type: string
 *                 - type: object
 *                   description: All users balance response
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           email:
 *                             type: string
 *                           balances:
 *                             type: object
 *                             properties:
 *                               main:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     balance:
 *                                       type: number
 *                                     coinId:
 *                                       type: string
 *                                     user:
 *                                       type: string
 *                               spot:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     balance:
 *                                       type: number
 *                                     coinId:
 *                                       type: string
 *                                     user:
 *                                       type: string
 *                               futures:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     balance:
 *                                       type: number
 *                                     coinId:
 *                                       type: string
 *                                     user:
 *                                       type: string
 *                     totalUsers:
 *                       type: number
 *       404:
 *         description: User not found (when userId is provided)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 */
router.get('/users/balance', tokenRequired, getUserBalance);

/**
 * @swagger
 * /api/admin/users/{userId}/vip-tier:
 *   patch:
 *     summary: Update user VIP tier
 *     description: Assign a VIP tier to a specific user
 *     tags: [Admin]
 *     security:
 *       - quantumAccessToken: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vipTierId:
 *                 type: string
 *                 required: true
 *                 description: VIP tier ID to assign to user
 *     responses:
 *       200:
 *         description: User VIP tier updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     vipTier:
 *                       type: string
 *       404:
 *         description: User or VIP tier not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 *       500:
 *         description: Failed to update user VIP tier
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 */
router.patch('/users/:userId/vip-tier', tokenRequired, updateUserVipTier);

/**
 * @swagger
 * /api/admin/vip-tiers:
 *   get:
 *     summary: Get all VIP tiers
 *     description: Retrieve all VIP tiers in the system
 *     tags: [Admin]
 *     security:
 *       - quantumAccessToken: []
 *     responses:
 *       200:
 *         description: VIP tiers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       vipName:
 *                         type: string
 *                       vipLevel:
 *                         type: number
 *                       vipStatus:
 *                         type: string
 *                       vipPercentage:
 *                         type: number
 *       500:
 *         description: Failed to get VIP tiers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 */
router.get('/vip-tiers', tokenRequired, getVipTier);

/**
 * @swagger
 * /api/admin/vip-tiers:
 *   post:
 *     summary: Add new VIP tier
 *     description: Create a new VIP tier
 *     tags: [Admin]
 *     security:
 *       - quantumAccessToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vipName
 *               - vipLevel
 *               - vipStatus
 *               - vipPercentage
 *             properties:
 *               vipName:
 *                 type: string
 *                 description: Name of the VIP tier
 *               vipLevel:
 *                 type: number
 *                 description: Level of the VIP tier
 *               vipStatus:
 *                 type: string
 *                 description: Status of the VIP tier
 *               vipPercentage:
 *                 type: number
 *                 description: Percentage associated with the VIP tier
 *     responses:
 *       200:
 *         description: VIP tier created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     vipName:
 *                       type: string
 *                     vipLevel:
 *                       type: number
 *                     vipStatus:
 *                       type: string
 *                     vipPercentage:
 *                       type: number
 *       400:
 *         description: Required field missing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 *       406:
 *         description: VIP level already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 *       500:
 *         description: Failed to add VIP tier
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 */
router.post('/vip-tiers', tokenRequired, addVipTier);

/**
 * @swagger
 * /api/admin/vip-tiers/{vipTierId}:
 *   patch:
 *     summary: Update VIP tier
 *     description: Update an existing VIP tier
 *     tags: [Admin]
 *     security:
 *       - quantumAccessToken: []
 *     parameters:
 *       - in: path
 *         name: vipTierId
 *         schema:
 *           type: string
 *         required: true
 *         description: VIP tier ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vipName:
 *                 type: string
 *                 description: Name of the VIP tier
 *               vipLevel:
 *                 type: number
 *                 description: Level of the VIP tier
 *               vipStatus:
 *                 type: string
 *                 description: Status of the VIP tier
 *               vipPercentage:
 *                 type: number
 *                 description: Percentage associated with the VIP tier
 *     responses:
 *       200:
 *         description: VIP tier updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     vipName:
 *                       type: string
 *                     vipLevel:
 *                       type: number
 *                     vipStatus:
 *                       type: string
 *                     vipPercentage:
 *                       type: number
 *       404:
 *         description: VIP tier not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 *       500:
 *         description: Failed to update VIP tier
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 */
router.patch('/vip-tiers/:vipTierId', tokenRequired, updateVipTier);

/**
 * @swagger
 * /api/admin/vip-tiers/{vipTierId}:
 *   delete:
 *     summary: Delete VIP tier
 *     description: Delete a VIP tier and remove it from all users
 *     tags: [Admin]
 *     security:
 *       - quantumAccessToken: []
 *     parameters:
 *       - in: path
 *         name: vipTierId
 *         schema:
 *           type: string
 *         required: true
 *         description: VIP tier ID to delete
 *     responses:
 *       200:
 *         description: VIP tier deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: VIP tier not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 *       500:
 *         description: Failed to delete VIP tier
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 */
router.delete('/vip-tiers/:vipTierId', tokenRequired, deleteVipTier);

/**
 * @swagger
 * /api/admin/users/update-ref-codes:
 *   post:
 *     summary: Update all users' refCode and refBy to 7 characters
 *     description: Loops through all users and truncates refCode and refBy fields to 7 characters
 *     tags: [Admin]
 *     security:
 *       - quantumAccessToken: []
 *     responses:
 *       200:
 *         description: Ref codes updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: number
 *                       description: Total number of users processed
 *                     updatedCount:
 *                       type: number
 *                       description: Number of users that were updated
 *                     skippedCount:
 *                       type: number
 *                       description: Number of users that were skipped (no changes needed)
 *       403:
 *         description: Only admins can update ref codes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 *       500:
 *         description: Failed to update ref codes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 */
router.post('/users/update-ref-codes', tokenRequired, updateRefCodesToSevenChars);

/**
 * @swagger
 * /api/admin/mass-deposit:
 *   post:
 *     summary: Mass deposit - Admin deposits large sum to platform
 *     description: Admin deposits a large amount to the platform when funds get exhausted
 *     tags: [Admin]
 *     security:
 *       - quantumAccessToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to deposit
 *               coinId:
 *                 type: string
 *                 default: "1280"
 *                 description: "Coin ID (default USDT)"
 *               coinName:
 *                 type: string
 *                 default: "USDT"
 *                 description: "Coin name"
 *               chain:
 *                 type: string
 *                 default: "ETH"
 *                 description: "Blockchain chain"
 *     responses:
 *       200:
 *         description: Mass deposit initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     coinId:
 *                       type: string
 *                     coinName:
 *                       type: string
 *                     chain:
 *                       type: string
 *                     recordId:
 *                       type: string
 *                     depositAddress:
 *                       type: string
 *                     qrCode:
 *                       type: string
 *       400:
 *         description: Valid amount is required
 *       403:
 *         description: Only admins can perform mass deposits
 *       500:
 *         description: Failed to process mass deposit
 */
router.post('/mass-deposit', tokenRequired, massDeposit);

/**
 * @swagger
 * /api/admin/mass-withdrawal:
 *   post:
 *     summary: Mass withdrawal - Withdraw all user funds with 5% charge
 *     description: Withdraws all user funds from the platform with a 5% charge
 *     tags: [Admin]
 *     security:
 *       - quantumAccessToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *             properties:
 *               address:
 *                 type: string
 *                 description: Withdrawal address
 *               chain:
 *                 type: string
 *                 default: "ETH"
 *                 description: Blockchain chain
 *               memo:
 *                 type: string
 *                 description: Memo for the withdrawal
 *     responses:
 *       200:
 *         description: Mass withdrawal initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                     totalUserFunds:
 *                       type: number
 *                     withdrawalAmount:
 *                       type: number
 *                     chargeAmount:
 *                       type: number
 *                     chargePercentage:
 *                       type: number
 *                     processedUsers:
 *                       type: number
 *                     recordId:
 *                       type: string
 *       400:
 *         description: Withdrawal address is required or no funds available
 *       403:
 *         description: Only admins can perform mass withdrawals
 *       500:
 *         description: Failed to process mass withdrawal
 */
router.post('/mass-withdrawal', tokenRequired, massWithdrawal);

/**
 * @swagger
 * /api/admin/total-balance:
 *   get:
 *     summary: Get total balance from CCPayment and user funds summary
 *     description: Shows CCPayment balance and total user funds with comparison
 *     tags: [Admin]
 *     security:
 *       - quantumAccessToken: []
 *     responses:
 *       200:
 *         description: Total balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     ccpaymentBalance:
 *                       type: object
 *                       properties:
 *                         amount:
 *                           type: number
 *                         currency:
 *                           type: string
 *                     userFunds:
 *                       type: object
 *                       properties:
 *                         mainBalance:
 *                           type: number
 *                         spotBalance:
 *                           type: number
 *                         futuresBalance:
 *                           type: number
 *                         total:
 *                           type: number
 *                         currency:
 *                           type: string
 *                     summary:
 *                       type: object
 *                       properties:
 *                         difference:
 *                           type: number
 *                         isOverdrawn:
 *                           type: boolean
 *                         message:
 *                           type: string
 *       403:
 *         description: Only admins can view total balance
 *       500:
 *         description: Failed to get total balance
 */
router.get('/total-balance', tokenRequired, getTotalBalance);

/**
 * @swagger
 * /api/admin/admin-wallet:
 *   get:
 *     summary: Get admin wallet balances
 *     description: Retrieve all admin wallet balances for different coins
 *     tags: [Admin]
 *     security:
 *       - quantumAccessToken: []
 *     responses:
 *       200:
 *         description: Admin wallet balances retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       coinId:
 *                         type: string
 *                       coinName:
 *                         type: string
 *                       currency:
 *                         type: string
 *                       chain:
 *                         type: string
 *                       balance:
 *                         type: number
 *                       updatedAt:
 *                         type: string
 *       403:
 *         description: Only admins can view admin wallet balances
 *       500:
 *         description: Failed to get admin wallet balances
 */
router.get('/admin-wallet', tokenRequired, getAdminWalletBalances);

/**
 * @swagger
 * /api/admin/reset-vip-levels:
 *   post:
 *     summary: Reset all users' VIP level to 0
 *     description: Admin endpoint to reset every user's VIP level to 0. This will create a VIP tier with level 0 if it doesn't exist and assign it to all users.
 *     tags: [Admin]
 *     security:
 *       - quantumAccessToken: []
 *     responses:
 *       200:
 *         description: Successfully reset VIP levels for all users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Successfully reset VIP level to 0 for 150 users"
 *                 data:
 *                   type: object
 *                   properties:
 *                     modifiedCount:
 *                       type: number
 *                       description: Number of users whose VIP level was updated
 *                       example: 150
 *                     vipTierId:
 *                       type: string
 *                       description: ID of the VIP tier with level 0
 *                       example: "507f1f77bcf86cd799439011"
 *                     vipTierName:
 *                       type: string
 *                       description: Name of the VIP tier
 *                       example: "Basic"
 *                     vipLevel:
 *                       type: number
 *                       description: VIP level (always 0 for this operation)
 *                       example: 0
 *             example:
 *               success: true
 *               message: "Successfully reset VIP level to 0 for 150 users"
 *               data:
 *                 modifiedCount: 150
 *                 vipTierId: "507f1f77bcf86cd799439011"
 *                 vipTierName: "Basic"
 *                 vipLevel: 0
 *       403:
 *         description: Only admins can reset VIP levels
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Only admins can reset VIP levels"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to reset VIP levels"
 *                 details:
 *                   type: string
 *                   example: "Database connection error"
 */
router.post('/reset-vip-levels', tokenRequired, resetAllUsersVipLevel);

/**
 * @swagger
 * /api/admin/deposit-history:
 *   get:
 *     summary: Get deposit history (admin only)
 *     description: Retrieve all deposit transactions including regular deposits and mass deposits
 *     tags: [Admin]
 *     security:
 *       - quantumAccessToken: []
 *     responses:
 *       200:
 *         description: Deposit history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Transaction ID
 *                         example: "507f1f77bcf86cd799439011"
 *                       user:
 *                         type: string
 *                         description: User ID who made the deposit
 *                         example: "507f1f77bcf86cd799439012"
 *                       coinId:
 *                         type: string
 *                         description: Coin ID
 *                         example: "1280"
 *                       currency:
 *                         type: string
 *                         description: Currency name
 *                         example: "USDT"
 *                       amount:
 *                         type: number
 *                         description: Deposit amount
 *                         example: 100.50
 *                       address:
 *                         type: string
 *                         description: Deposit address
 *                         example: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
 *                       chain:
 *                         type: string
 *                         description: Blockchain network
 *                         example: "TRX"
 *                       orderId:
 *                         type: string
 *                         description: Order ID for the transaction
 *                         example: "DEPOSIT_1234567890"
 *                       recordId:
 *                         type: string
 *                         description: Record ID from payment processor
 *                         example: "REC_123456789"
 *                       status:
 *                         type: string
 *                         enum: [pending, processing, completed, failed]
 *                         description: Transaction status
 *                         example: "completed"
 *                       type:
 *                         type: string
 *                         enum: [deposit, mass_deposit]
 *                         description: Transaction type
 *                         example: "deposit"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Transaction creation timestamp
 *                         example: "2024-01-15T10:30:00.000Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: Transaction last update timestamp
 *                         example: "2024-01-15T10:35:00.000Z"
 *             example:
 *               status: true
 *               data:
 *                 - _id: "507f1f77bcf86cd799439011"
 *                   user: "507f1f77bcf86cd799439012"
 *                   coinId: "1280"
 *                   currency: "USDT"
 *                   amount: 100.50
 *                   address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
 *                   chain: "TRX"
 *                   orderId: "DEPOSIT_1234567890"
 *                   recordId: "REC_123456789"
 *                   status: "completed"
 *                   type: "deposit"
 *                   createdAt: "2024-01-15T10:30:00.000Z"
 *                   updatedAt: "2024-01-15T10:35:00.000Z"
 *                 - _id: "507f1f77bcf86cd799439013"
 *                   user: "507f1f77bcf86cd799439014"
 *                   coinId: "1280"
 *                   currency: "USDT"
 *                   amount: 500.00
 *                   address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
 *                   chain: "TRX"
 *                   orderId: "MASS_DEPOSIT_1234567890"
 *                   recordId: "REC_123456790"
 *                   status: "processing"
 *                   type: "mass_deposit"
 *                   createdAt: "2024-01-15T11:00:00.000Z"
 *                   updatedAt: "2024-01-15T11:00:00.000Z"
 *       403:
 *         description: Only admins can view deposit history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Only admins can view deposit history"
 *       500:
 *         description: Failed to get deposit history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to get deposit history"
 *                 details:
 *                   type: string
 *                   example: "Database connection error"
 */
router.get('/deposit-history', tokenRequired, getDepositHistory);

/**
 * @swagger
 * /api/admin/withdrawal-history:
 *   get:
 *     summary: Get withdrawal history (admin only)
 *     description: Retrieve all withdrawal transactions including regular withdrawals and mass withdrawals
 *     tags: [Admin]
 *     security:
 *       - quantumAccessToken: []
 *     responses:
 *       200:
 *         description: Withdrawal history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Transaction ID
 *                         example: "507f1f77bcf86cd799439015"
 *                       user:
 *                         type: string
 *                         description: User ID who made the withdrawal
 *                         example: "507f1f77bcf86cd799439016"
 *                       coinId:
 *                         type: string
 *                         description: Coin ID
 *                         example: "1280"
 *                       currency:
 *                         type: string
 *                         description: Currency name
 *                         example: "USDT"
 *                       amount:
 *                         type: number
 *                         description: Withdrawal amount
 *                         example: 50.25
 *                       address:
 *                         type: string
 *                         description: Withdrawal address
 *                         example: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
 *                       chain:
 *                         type: string
 *                         description: Blockchain network
 *                         example: "TRX"
 *                       memo:
 *                         type: string
 *                         description: Memo for the withdrawal (optional)
 *                         example: "Withdrawal memo"
 *                       orderId:
 *                         type: string
 *                         description: Order ID for the transaction
 *                         example: "WITHDRAWAL_1234567890"
 *                       recordId:
 *                         type: string
 *                         description: Record ID from payment processor
 *                         example: "REC_123456791"
 *                       status:
 *                         type: string
 *                         enum: [pending, processing, completed, failed]
 *                         description: Transaction status
 *                         example: "completed"
 *                       type:
 *                         type: string
 *                         enum: [withdrawal, mass_withdrawal]
 *                         description: Transaction type
 *                         example: "withdrawal"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Transaction creation timestamp
 *                         example: "2024-01-15T12:00:00.000Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: Transaction last update timestamp
 *                         example: "2024-01-15T12:05:00.000Z"
 *             example:
 *               status: true
 *               data:
 *                 - _id: "507f1f77bcf86cd799439015"
 *                   user: "507f1f77bcf86cd799439016"
 *                   coinId: "1280"
 *                   currency: "USDT"
 *                   amount: 50.25
 *                   address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
 *                   chain: "TRX"
 *                   memo: "Withdrawal memo"
 *                   orderId: "WITHDRAWAL_1234567890"
 *                   recordId: "REC_123456791"
 *                   status: "completed"
 *                   type: "withdrawal"
 *                   createdAt: "2024-01-15T12:00:00.000Z"
 *                   updatedAt: "2024-01-15T12:05:00.000Z"
 *                 - _id: "507f1f77bcf86cd799439017"
 *                   user: "507f1f77bcf86cd799439018"
 *                   coinId: "1280"
 *                   currency: "USDT"
 *                   amount: 1000.00
 *                   address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
 *                   chain: "TRX"
 *                   memo: "Mass withdrawal"
 *                   orderId: "MASS_WITHDRAWAL_1234567890"
 *                   recordId: "REC_123456792"
 *                   status: "processing"
 *                   type: "mass_withdrawal"
 *                   createdAt: "2024-01-15T13:00:00.000Z"
 *                   updatedAt: "2024-01-15T13:00:00.000Z"
 *       403:
 *         description: Only admins can view withdrawal history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Only admins can view withdrawal history"
 *       500:
 *         description: Failed to get withdrawal history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to get withdrawal history"
 *                 details:
 *                   type: string
 *                   example: "Database connection error"
 */
router.get('/withdrawal-history', tokenRequired, getWithdrawalHistory);

// Placeholder for admin routes
router.get('/test', tokenRequired, (req, res) => {
    res.json({ message: 'Admin route working' });
});

module.exports = router; 