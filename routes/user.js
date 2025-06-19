let express = require('express');
const { getProfile, getBalance, transactionHistory } = require('../controllers/user');
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
 * /api/user/trnasactions:
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


module.exports = router;
