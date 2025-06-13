let express = require('express');
const { getTradingPairs, getAllCurrency, getDepositAddress, getFuturesWalletBalance, getSpotWalletBalance, fundFuturesAccount } = require('../controllers/bitmart');

const { tokenRequired } = require('../middleware/auth');
let router = express.Router();

/**
 * @swagger
 * /api/bitmart/trading-pairs:
 *   get:
 *    summary: Retrieve all trading pairs from BitMart
 *    security:
 *      - quantumAccessToken: []
 *    tags: [Bitmart]
 *    responses:
 *      200:
 *        description: List of trading pairs
 *      500:
 *        description: Server error
 */
router.get('/trading-pairs', tokenRequired, getTradingPairs);

/**
 * @swagger
 * /api/bitmart/currencies:
 *   get:
 *    summary: Retrieve all currencies from BitMart
 *    security:
 *      - quantumAccessToken: []
 *    tags: [Bitmart]
 *    responses:
 *      200:
 *        description: List of currencies
 *      500:
 *        description: Server error
 */
router.get('/currencies', tokenRequired, getAllCurrency);

/**
 * @swagger
 * /api/bitmart/deposit-address:
 *   get:
 *    summary: Retrieve deposit address for a specific currency
 *    security:
 *      - quantumAccessToken: []
 *    tags: [Bitmart]
 *    parameters:
 *      - in: query
 *        name: currency
 *        required: true
 *        schema:
 *          type: string
 *        description: The currency for which to retrieve the deposit address
 *    responses:
 *      200:
 *        description: Deposit address retrieved successfully
 *      500:
 *        description: Server error
 */
router.get('/deposit-address', tokenRequired, getDepositAddress);


/**
 * @swagger
 * /api/bitmart/wallet/spot-balance:
 *   get:
 *     summary: Retrieves the spot balance for a user
 *     description: If a coinId is provided, returns the balance for that specific coin. Otherwise, returns all spot balances for the user.
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Bitmart]
 *     parameters:
 *       - in: path
 *         name: coinId
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional coin ID to retrieve balance for
 *     responses:
 *       200:
 *         description: Spot balance data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Error message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get('/wallet/spot-balance', tokenRequired, getSpotWalletBalance);


/**
 * @swagger
 * /api/bitmart/wallet/futures-balance:
 *   get:
 *     summary: Retrieves the futures balance for a user
 *     description: If a coinId is provided, returns the balance for that specific coin. Otherwise, returns all futures balances for the user.
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Bitmart]
 *     parameters:
 *       - in: path
 *         name: coinId
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional coin ID to retrieve balance for
 *     responses:
 *       200:
 *         description: Futures balance data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Error message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get('/wallet/futures-balance', tokenRequired, getFuturesWalletBalance);


/**
 * @swagger
 * /api/bitmart/fund-futures-account:
 *   post:
 *     summary: Funds the user's futures account with a specified amount of a currency
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Bitmart]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - coin
 *               - amount
 *             properties:
 *               coin:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Futures balance updated successfully
 *       500:
 *         description: Server error
 */
router.post('/fund-futures-account', tokenRequired, fundFuturesAccount);


module.exports = router;