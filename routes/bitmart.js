let express = require('express');
const { getTradingPairs, getAllCurrency, getDepositAddress, getFuturesWalletBalance, getSpotWalletBalance, fundFuturesAccount, testSpotOrder, submitSpotOrder, testTrades, transferFromSpotsToFutures } = require('../controllers/bitmart');

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
 * /api/bitmart/test-get-trades:
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
 *               symbol:
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
router.post('/test-get-trades', tokenRequired, testTrades);

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


/**
 * @swagger
 * /api/bitmart/transfer/spot-to-futures:
 *   post:
 *     tags:
 *       - Account Transfer
 *     summary: Transfer funds from Spot to Futures account
 *     description: |
 *       Transfers specified amount of currency from user's spot trading account to futures trading account.
 *       The system automatically calculates the current spot balance from order history before executing the transfer.
 *       No fees are charged for internal transfers between spot and futures accounts.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currency
 *               - amount
 *             properties:
 *               currency:
 *                 type: string
 *                 description: Currency code to transfer
 *                 example: "USDT"
 *                 enum: ["USDT", "BTC", "ETH", "ZEUS"]
 *               amount:
 *                 type: number
 *                 description: Amount to transfer (must be positive)
 *                 minimum: 0.00000001
 *                 example: 100.50
 *           examples:
 *             transfer_usdt:
 *               summary: Transfer USDT
 *               value:
 *                 currency: "USDT"
 *                 amount: 100.50
 *             transfer_btc:
 *               summary: Transfer BTC
 *               value:
 *                 currency: "BTC"
 *                 amount: 0.001
 *             transfer_zeus:
 *               summary: Transfer ZEUS tokens
 *               value:
 *                 currency: "ZEUS"
 *                 amount: 1000
 *     responses:
 *       200:
 *         description: Transfer completed successfully
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
 *                   example: "Successfully transferred 100.50 USDT to futures account"
 *                 transferId:
 *                   type: string
 *                   description: BitMart transfer ID for tracking
 *                   example: "transfer_12345678"
 *                 newSpotBalance:
 *                   type: string
 *                   description: Remaining spot balance after transfer
 *                   example: "399.50000000"
 *                 transferRecord:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                       example: "60d5ecb74b24b23f8c8b4567"
 *                     currency:
 *                       type: string
 *                       example: "USDT"
 *                     amount:
 *                       type: number
 *                       example: 100.50
 *                     type:
 *                       type: string
 *                       example: "spot_to_futures"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-06-18T00:53:10.000Z"
 *                     status:
 *                       type: string
 *                       example: "completed"
 *             examples:
 *               successful_transfer:
 *                 summary: Successful transfer response
 *                 value:
 *                   success: true
 *                   message: "Successfully transferred 100.50 USDT to futures account"
 *                   transferId: "transfer_12345678"
 *                   newSpotBalance: "399.50000000"
 *                   transferRecord:
 *                     userId: "60d5ecb74b24b23f8c8b4567"
 *                     currency: "USDT"
 *                     amount: 100.50
 *                     type: "spot_to_futures"
 *                     timestamp: "2025-06-18T00:53:10.000Z"
 *                     status: "completed"
 *       400:
 *         description: Bad request - Invalid input or insufficient balance
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
 *                   description: Error message describing what went wrong
 *             examples:
 *               invalid_input:
 *                 summary: Invalid currency or amount
 *                 value:
 *                   success: false
 *                   error: "Invalid currency or amount"
 *               insufficient_balance:
 *                 summary: Insufficient spot balance
 *                 value:
 *                   success: false
 *                   error: "Insufficient USDT balance in spot wallet. Available: 50.25000000, Requested: 100.50"
 *               transfer_failed:
 *                 summary: BitMart API transfer failure
 *                 value:
 *                   success: false
 *                   error: "Transfer failed"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
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
 *                   example: "Access token required"
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
 *                   example: "Failed to transfer funds to futures account"
 *                 details:
 *                   type: string
 *                   description: Detailed error message for debugging
 *                   example: "Network timeout while connecting to BitMart API"
 */
router.post('/transfer/spot-to-futures', tokenRequired, transferFromSpotsToFutures);


module.exports = router;