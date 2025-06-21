const express = require('express');
const { 
    submitSpotOrder, 
    getAllOrders, 
    getAvailableOrders, 
    makeUserAdmin, 
    removeAdmin, 
    getAllUsers,
    getAllWithdrawalRequests,
    approveWithdrawalRequest,
    declineWithdrawalRequest,
    getOrderDetails,
    getAllTransfers,
    getTransferStats,
    getUserTransferDetails
} = require('../controllers/admin');
const { tokenRequired } = require('../middleware/auth');

const router = express.Router();

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
 *               notional:
 *                 type: number
 *               expiration:
 *                 type: string
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
 *     responses:
 *       200:
 *         description: Withdrawal request approved successfully
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
 *     responses:
 *       200:
 *         description: Withdrawal request declined successfully
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
 *       - in: query
 *         name: coinId
 *         schema:
 *           type: string
 *         description: Filter by coin ID
 *       - in: query
 *         name: accountType
 *         schema:
 *           type: string
 *           enum: [spot, futures]
 *         description: Filter by account type
 *     responses:
 *       200:
 *         description: User transfer details retrieved successfully
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.get('/user-transfers/:userId', tokenRequired, getUserTransferDetails);

// Placeholder for admin routes
router.get('/test', tokenRequired, (req, res) => {
    res.json({ message: 'Admin route working' });
});

module.exports = router; 