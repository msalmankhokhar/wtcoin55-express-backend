let express = require('express');
const { getTradingPairs, getAllCurrency, getDepositAddress, getFuturesWalletBalance, getSpotWalletBalance, fundFuturesAccount, testSpotOrder, submitSpotOrder } = require('../controllers/bitmart');

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
 *     summary: Retrieve all currencies from BitMart
 *     security:
 *       - quantumAccessToken: []
 *     tags: [Bitmart]
 *     parameters:
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *         description: Maximum number of currencies to retrieve
 *         default: 20
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *     responses:
 *       200:
 *         description: List of currencies
 *       500:
 *         description: Server error
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



/**
 * @swagger
 * /api/bitmart/test-get-spot-order:
 *   post:
 *     summary: Test retrieval of a spot order
 *     tags: [Bitmart]
 *     security:
 *       - quantumAccessToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: ID of the spot order to retrieve
 *     responses:
 *       200:
 *         description: Spot order data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Server error
 */
router.post('/test-get-spot-order', tokenRequired, testSpotOrder);

/**
 * @swagger
 * /api/bitmart/spot-order:
 *   post:
 *     summary: Submit spot order
 *     description: Submit a spot order to BitMart
 *     tags:
 *       - Spot
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               symbol:
 *                 type: string
 *                 description: The symbol of the currency pair
 *               side:
 *                 type: string
 *                 description: buy or sell
 *               type:
 *                 type: string
 *                 description: limit, market, limit_maker, or ioc
 *               price:
 *                 type: number
 *                 description: The price at which to place the order
 *               quantity:
 *                 type: number
 *                 description: The quantity of the order
 *     responses:
 *       200:
 *         description: Successfully submitted the order
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 order_id:
 *                   type: string
 *                   description: The ID of the submitted order
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal error
 */
router.post('/spot-order', tokenRequired, submitSpotOrder);


module.exports = router;