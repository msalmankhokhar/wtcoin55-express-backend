const express = require('express');
const { submitWithdrawalRequest, getUserWithdrawalRequests } = require('../controllers/withdrawal');
const { tokenRequired } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/withdrawal/request:
 *   post:
 *     summary: Submit withdrawal request
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Withdrawal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - coinId
 *               - coinName
 *               - amount
 *               - address
 *               - chain
 *             properties:
 *               coinId:
 *                 type: number
 *               coinName:
 *                 type: string
 *               amount:
 *                 type: number
 *               address:
 *                 type: string
 *               chain:
 *                 type: string
 *               memo:
 *                 type: string
 *               walletType:
 *                 type: string
 *                 enum: [main, spot, futures]
 *                 default: main
 *     responses:
 *       200:
 *         description: Withdrawal request submitted successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Server error
 */
router.post('/request', tokenRequired, submitWithdrawalRequest);

/**
 * @swagger
 * /api/withdrawal/my-requests:
 *   get:
 *     summary: Get user's withdrawal requests
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Withdrawal]
 *     responses:
 *       200:
 *         description: User's withdrawal requests retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/my-requests', tokenRequired, getUserWithdrawalRequests);

module.exports = router; 