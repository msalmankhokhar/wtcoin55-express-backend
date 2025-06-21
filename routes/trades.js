const express = require('express');
const { followSpotOrder, getUserOrders } = require('../controllers/trades');
const { tokenRequired } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/trades/follow-order:
 *   post:
 *     summary: Follow a spot order (simulated trading)
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Trades]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - copyCode
 *             properties:
 *               copyCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order followed successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.post('/follow-order', tokenRequired, followSpotOrder);

/**
 * @swagger
 * /api/trades/my-orders:
 *   get:
 *     summary: Get user's own orders
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Trades]
 *     responses:
 *       200:
 *         description: User orders retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/my-orders', tokenRequired, getUserOrders);

module.exports = router; 