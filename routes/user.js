let express = require('express');
const { getProfile, getBalance, transactionHistory, getUserBalances, getUserTradingVolumeStatus } = require('../controllers/user');
const { tokenRequired } = require('../middleware/auth');

let router = express.Router();


/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Get logged in user's profile
 *     tags: [User]
 *     security:
 *       - quantumAccessToken: []
 *     responses:
 *       200:
 *         description: User profile returned
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/profile', tokenRequired, getProfile);


/**
 * @swagger
 * /api/user/assets:
 *   get:
 *     summary: Retrieve the user's main balance
 *     tags: [User]
 *     security:
 *       - quantumAccessToken: []
 *     responses:
 *       200:
 *         description: Successfully retrieved balance
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   user:
 *                     type: string
 *                   coinId:
 *                     type: number
 *                   coinName:
 *                     type: string
 *                   balance:
 *                     type: number
 *       500:
 *         description: Server error
 */
router.get('/assets', tokenRequired, getBalance);

/**
 * @swagger
 * /api/user/transactions:
 *   get:
 *     summary: Retrieve the user's transactions
 *     tags: [User]
 *     security:
 *       - quantumAccessToken: []
 *     responses:
 *       200:
 *         description: Successfully retrieved transactions
 *       500:
 *         description: Server Error
 */
router.get('/transactions', tokenRequired, transactionHistory);

/**
 * @swagger
 * /api/user/balances:
 *   get:
 *     summary: Get user's balances across all accounts (Exchange, Spot, Futures)
 *     tags: [User]
 *     security:
 *       - quantumAccessToken: []
 *     responses:
 *       200:
 *         description: Successfully retrieved all balances
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
 *                     exchange:
 *                       type: array
 *                       description: Exchange (main) balances
 *                     spot:
 *                       type: array
 *                       description: Spot trading balances
 *                     futures:
 *                       type: array
 *                       description: Futures trading balances
 *       500:
 *         description: Server error
 */
router.get('/balances', tokenRequired, getUserBalances);

/**
 * @swagger
 * /api/user/trading-volume-status:
 *   get:
 *     summary: Get user's trading volume status for all coins
 *     tags: [User]
 *     security:
 *       - quantumAccessToken: []
 *     responses:
 *       200:
 *         description: Successfully retrieved trading volume status
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
 *                     spot:
 *                       type: array
 *                       description: Spot trading volume status
 *                     futures:
 *                       type: array
 *                       description: Futures trading volume status
 *       500:
 *         description: Server error
 */
router.get('/trading-volume-status', tokenRequired, getUserTradingVolumeStatus);

module.exports = router;
