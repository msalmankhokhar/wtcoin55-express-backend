let express = require('express');
const { getTradingPairs, getAllCurrency, getDepositAddress, getFuturesWalletBalance, getSpotWalletBalance, fundFuturesAccount, testSpotOrder, submitSpotOrder, testTrades, transferFromSpotsToFutures, submitFuturesPlanOrder, GetContractDetails, FollowFuturesOrder, createFuturesOrder } = require('../controllers/bitmart');

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


// /**
//  * @swagger
//  * /api/bitmart/fund-futures-account:
//  *   post:
//  *     summary: Funds the user's futures account with a specified amount of a currency
//  *     security:
//  *       - quantumAccessToken: []
//  *     tags: [Bitmart]
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - coin
//  *               - amount
//  *             properties:
//  *               coin:
//  *                 type: string
//  *               amount:
//  *                 type: number
//  *     responses:
//  *       200:
//  *         description: Futures balance updated successfully
//  *       500:
//  *         description: Server error
//  */
// router.post('/fund-futures-account', tokenRequired, fundFuturesAccount);



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

// /**
//  * @swagger
//  * /api/bitmart/spot-order:
//  *   post:
//  *     summary: Submit spot order
//  *     description: Submit a spot order to BitMart
//  *     tags:
//  *       - Spot
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               symbol:
//  *                 type: string
//  *                 description: The symbol of the currency pair
//  *               side:
//  *                 type: string
//  *                 description: buy or sell
//  *               type:
//  *                 type: string
//  *                 description: limit, market, limit_maker, or ioc
//  *               price:
//  *                 type: number
//  *                 description: The price at which to place the order
//  *               quantity:
//  *                 type: number
//  *                 description: The quantity of the order
//  *     responses:
//  *       200:
//  *         description: Successfully submitted the order
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 order_id:
//  *                   type: string
//  *                   description: The ID of the submitted order
//  *       400:
//  *         description: Bad request
//  *       500:
//  *         description: Internal error
//  */

/**
 * @swagger
 * /api/bitmart/spot-order:
 *   post:
 *     tags:
 *       - Spot Trading
 *     summary: Submit spot trading order
 *     description: |
 *       Submit a spot trading order to BitMart exchange. Supports limit, market, limit_maker, and IOC orders.
 *       The system automatically checks balance before submission and tracks the order for copy trading.
 *       
 *       **Order Types:**
 *       - `limit`: Standard limit order with specified price
 *       - `market`: Immediate execution at current market price
 *       - `limit_maker`: Limit order that only adds liquidity (maker only)
 *       - `ioc`: Immediate or Cancel order
 *       
 *       **Balance Logic:**
 *       - For BUY orders: Checks quote currency balance (e.g., USDT for ZEUS_USDT)
 *       - For SELL orders: Checks base currency balance (e.g., ZEUS for ZEUS_USDT)
 *       - Special handling for USDT (coinId: 1280)
 *     security:
 *       - quantumAccessToken: []
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
 *                 description: Trading pair symbol (format BASECOIN_QUOTECOIN)
 *                 example: "ZEUS_USDT"
 *                 pattern: "^[A-Z]+_[A-Z]+$"
 *               side:
 *                 type: string
 *                 description: Order side
 *                 enum: ["buy", "sell"]
 *                 example: "buy"
 *               type:
 *                 type: string
 *                 description: Order type
 *                 enum: ["limit", "market", "limit_maker", "ioc"]
 *                 example: "limit"
 *               price:
 *                 type: number
 *                 description: |
 *                   Order price (required for limit orders, optional for market orders)
 *                   Must be greater than 0 for limit orders
 *                 minimum: 0.00000001
 *                 example: 0.185
 *               quantity:
 *                 type: number
 *                 description: |
 *                   Order quantity in base currency (required for limit orders and market sell orders)
 *                   Must be greater than 0
 *                 minimum: 0.00000001
 *                 example: 1000
 *               notional:
 *                 type: string
 *                 description: |
 *                   Order amount in quote currency (optional, mainly used for market buy orders)
 *                   When specified for market buy, quantity can be omitted
 *                 example: "185.00"
 *           examples:
 *             limit_buy_order:
 *               summary: Limit Buy Order
 *               description: Buy 1000 ZEUS at 0.185 USDT each
 *               value:
 *                 symbol: "ZEUS_USDT"
 *                 side: "buy"
 *                 type: "limit"
 *                 price: 0.185
 *                 quantity: 1000
 *             limit_sell_order:
 *               summary: Limit Sell Order
 *               description: Sell 500 ZEUS at 0.19 USDT each
 *               value:
 *                 symbol: "ZEUS_USDT"
 *                 side: "sell"
 *                 type: "limit"
 *                 price: 0.19
 *                 quantity: 500
 *             market_buy_order:
 *               summary: Market Buy Order
 *               description: Buy ZEUS worth 100 USDT at current market price
 *               value:
 *                 symbol: "ZEUS_USDT"
 *                 side: "buy"
 *                 type: "market"
 *                 notional: "100.00"
 *             market_sell_order:
 *               summary: Market Sell Order
 *               description: Sell 200 ZEUS at current market price
 *               value:
 *                 symbol: "ZEUS_USDT"
 *                 side: "sell"
 *                 type: "market"
 *                 quantity: 200
 *             limit_maker_order:
 *               summary: Limit Maker Order
 *               description: Place maker-only order (will be rejected if it would execute immediately)
 *               value:
 *                 symbol: "ZEUS_USDT"
 *                 side: "buy"
 *                 type: "limit_maker"
 *                 price: 0.18
 *                 quantity: 1500
 *             ioc_order:
 *               summary: IOC (Immediate or Cancel) Order
 *               description: Execute immediately or cancel unfilled portion
 *               value:
 *                 symbol: "ZEUS_USDT"
 *                 side: "buy"
 *                 type: "ioc"
 *                 price: 0.186
 *                 quantity: 800
 *     responses:
 *       200:
 *         description: Order submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "success"
 *                 code:
 *                   type: number
 *                   example: 1000
 *                 trace:
 *                   type: string
 *                   example: "886fb6ae-456b-4654-b4e0-d681ac05cea1"
 *                 data:
 *                   type: object
 *                   properties:
 *                     order_id:
 *                       type: string
 *                       description: BitMart order ID for tracking
 *                       example: "1234567890123456789"
 *                     symbol:
 *                       type: string
 *                       example: "ZEUS_USDT"
 *                     side:
 *                       type: string
 *                       example: "buy"
 *                     type:
 *                       type: string
 *                       example: "limit"
 *                     notional:
 *                       type: string
 *                       description: Total order value in quote currency
 *                       example: "185.00000000"
 *                     size:
 *                       type: string
 *                       description: Order quantity in base currency
 *                       example: "1000.00000000"
 *                     price:
 *                       type: string
 *                       description: Order price (or "market price" for market orders)
 *                       example: "0.18500000"
 *                     state:
 *                       type: string
 *                       description: Initial order state
 *                       example: "new"
 *             examples:
 *               successful_limit_order:
 *                 summary: Successful limit order response
 *                 value:
 *                   message: "success"
 *                   code: 1000
 *                   trace: "886fb6ae-456b-4654-b4e0-d681ac05cea1"
 *                   data:
 *                     order_id: "1234567890123456789"
 *                     symbol: "ZEUS_USDT"
 *                     side: "buy"
 *                     type: "limit"
 *                     notional: "185.00000000"
 *                     size: "1000.00000000"
 *                     price: "0.18500000"
 *                     state: "new"
 *               successful_market_order:
 *                 summary: Successful market order response
 *                 value:
 *                   message: "success"
 *                   code: 1000
 *                   trace: "886fb6ae-456b-4654-b4e0-d681ac05cea1"
 *                   data:
 *                     order_id: "1234567890123456790"
 *                     symbol: "ZEUS_USDT"
 *                     side: "buy"
 *                     type: "market"
 *                     notional: "100.00000000"
 *                     size: "538.17204301"
 *                     price: "market price"
 *                     state: "new"
 *       400:
 *         description: Bad request - Invalid parameters or insufficient balance
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
 *                   description: Error message describing the issue
 *             examples:
 *               insufficient_funds:
 *                 summary: Insufficient balance
 *                 value:
 *                   message: "Insufficient funds"
 *               invalid_symbol:
 *                 summary: Invalid trading pair
 *                 value:
 *                   message: "Invalid symbol format"
 *               missing_price:
 *                 summary: Missing required price for limit order
 *                 value:
 *                   message: "Price is required for limit orders"
 *               missing_quantity:
 *                 summary: Missing required quantity
 *                 value:
 *                   message: "Quantity is required for this order type"
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
 *         description: Internal server error or BitMart API error
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
 *             examples:
 *               api_error:
 *                 summary: BitMart API error
 *                 value:
 *                   error: "Failed to submit spot order"
 *               server_error:
 *                 summary: Internal server error
 *                 value:
 *                   error: "Database connection failed"
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: JWT token obtained from login endpoint
 *   
 *   schemas:
 *     SpotOrderRequest:
 *       type: object
 *       required:
 *         - symbol
 *         - side
 *         - type
 *       properties:
 *         symbol:
 *           type: string
 *           pattern: "^[A-Z]+_[A-Z]+$"
 *           description: Trading pair in format BASE_QUOTE
 *         side:
 *           type: string
 *           enum: ["buy", "sell"]
 *         type:
 *           type: string
 *           enum: ["limit", "market", "limit_maker", "ioc"]
 *         price:
 *           type: number
 *           minimum: 0.00000001
 *         quantity:
 *           type: number
 *           minimum: 0.00000001
 *         notional:
 *           type: string
 *     
 *     SpotOrderResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         code:
 *           type: number
 *         trace:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             order_id:
 *               type: string
 *             symbol:
 *               type: string
 *             side:
 *               type: string
 *             type:
 *               type: string
 *             notional:
 *               type: string
 *             size:
 *               type: string
 *             price:
 *               type: string
 *             state:
 *               type: string
 *     
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *         error:
 *           type: string
 */
router.post('/spot-order', tokenRequired, submitSpotOrder);


// /**
//  * @swagger
//  * /api/bitmart/transfer/spot-to-futures:
//  *   post:
//  *     tags:
//  *       - Account Transfer
//  *     summary: Transfer funds from Spot to Futures account
//  *     description: |
//  *       Transfers specified amount of currency from user's spot trading account to futures trading account.
//  *       The system automatically calculates the current spot balance from order history before executing the transfer.
//  *       No fees are charged for internal transfers between spot and futures accounts.
//  *     security:
//  *       - bearerAuth: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - currency
//  *               - amount
//  *             properties:
//  *               currency:
//  *                 type: string
//  *                 description: Currency code to transfer
//  *                 example: "USDT"
//  *                 enum: ["USDT", "BTC", "ETH", "ZEUS"]
//  *               amount:
//  *                 type: number
//  *                 description: Amount to transfer (must be positive)
//  *                 minimum: 0.00000001
//  *                 example: 100.50
//  *           examples:
//  *             transfer_usdt:
//  *               summary: Transfer USDT
//  *               value:
//  *                 currency: "USDT"
//  *                 amount: 100.50
//  *             transfer_btc:
//  *               summary: Transfer BTC
//  *               value:
//  *                 currency: "BTC"
//  *                 amount: 0.001
//  *             transfer_zeus:
//  *               summary: Transfer ZEUS tokens
//  *               value:
//  *                 currency: "ZEUS"
//  *                 amount: 1000
//  *     responses:
//  *       200:
//  *         description: Transfer completed successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                   example: true
//  *                 message:
//  *                   type: string
//  *                   example: "Successfully transferred 100.50 USDT to futures account"
//  *                 transferId:
//  *                   type: string
//  *                   description: BitMart transfer ID for tracking
//  *                   example: "transfer_12345678"
//  *                 newSpotBalance:
//  *                   type: string
//  *                   description: Remaining spot balance after transfer
//  *                   example: "399.50000000"
//  *                 transferRecord:
//  *                   type: object
//  *                   properties:
//  *                     userId:
//  *                       type: string
//  *                       example: "60d5ecb74b24b23f8c8b4567"
//  *                     currency:
//  *                       type: string
//  *                       example: "USDT"
//  *                     amount:
//  *                       type: number
//  *                       example: 100.50
//  *                     type:
//  *                       type: string
//  *                       example: "spot_to_futures"
//  *                     timestamp:
//  *                       type: string
//  *                       format: date-time
//  *                       example: "2025-06-18T00:53:10.000Z"
//  *                     status:
//  *                       type: string
//  *                       example: "completed"
//  *             examples:
//  *               successful_transfer:
//  *                 summary: Successful transfer response
//  *                 value:
//  *                   success: true
//  *                   message: "Successfully transferred 100.50 USDT to futures account"
//  *                   transferId: "transfer_12345678"
//  *                   newSpotBalance: "399.50000000"
//  *                   transferRecord:
//  *                     userId: "60d5ecb74b24b23f8c8b4567"
//  *                     currency: "USDT"
//  *                     amount: 100.50
//  *                     type: "spot_to_futures"
//  *                     timestamp: "2025-06-18T00:53:10.000Z"
//  *                     status: "completed"
//  *       400:
//  *         description: Bad request - Invalid input or insufficient balance
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                   example: false
//  *                 error:
//  *                   type: string
//  *                   description: Error message describing what went wrong
//  *             examples:
//  *               invalid_input:
//  *                 summary: Invalid currency or amount
//  *                 value:
//  *                   success: false
//  *                   error: "Invalid currency or amount"
//  *               insufficient_balance:
//  *                 summary: Insufficient spot balance
//  *                 value:
//  *                   success: false
//  *                   error: "Insufficient USDT balance in spot wallet. Available: 50.25000000, Requested: 100.50"
//  *               transfer_failed:
//  *                 summary: BitMart API transfer failure
//  *                 value:
//  *                   success: false
//  *                   error: "Transfer failed"
//  *       401:
//  *         description: Unauthorized - Invalid or missing authentication token
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                   example: false
//  *                 error:
//  *                   type: string
//  *                   example: "Access token required"
//  *       500:
//  *         description: Internal server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                   example: false
//  *                 error:
//  *                   type: string
//  *                   example: "Failed to transfer funds to futures account"
//  *                 details:
//  *                   type: string
//  *                   description: Detailed error message for debugging
//  *                   example: "Network timeout while connecting to BitMart API"
//  */
// router.post('/transfer/spot-to-futures', tokenRequired, transferFromSpotsToFutures);


/**
 * @swagger
 * /api/bitmart/futures/submit-plan-order:
 *   post:
 *     tags:
 *       - Futures Trading
 *     summary: Submit futures plan order
 *     description: |
 *       Submit a futures plan order with trigger conditions. Supports all order types including
 *       limit, market, take_profit, and stop_loss with optional TP/SL settings.
 *     security:
 *       - bearerAuth: []
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
 *               - leverage
 *               - open_type
 *               - size
 *               - trigger_price
 *               - price_way
 *               - price_type
 *             properties:
 *               symbol:
 *                 type: string
 *                 example: "ETHUSDT"
 *               side:
 *                 type: number
 *                 enum: [1, 2, 3, 4]
 *                 example: 4
 *               type:
 *                 type: string
 *                 enum: ["limit", "market", "take_profit", "stop_loss"]
 *                 example: "limit"
 *               leverage:
 *                 type: string
 *                 example: "10"
 *               open_type:
 *                 type: string
 *                 enum: ["cross", "isolated"]
 *                 example: "isolated"
 *               size:
 *                 type: number
 *                 example: 10
 *               trigger_price:
 *                 type: string
 *                 example: "2000"
 *               executive_price:
 *                 type: string
 *                 example: "1450"
 *               price_way:
 *                 type: number
 *                 enum: [1, 2]
 *                 example: 2
 *               price_type:
 *                 type: number
 *                 enum: [1, 2]
 *                 example: 1
 *               mode:
 *                 type: number
 *                 enum: [1, 2, 3, 4]
 *                 example: 1
 *               preset_take_profit_price:
 *                 type: string
 *                 example: "1400"
 *               preset_stop_loss_price:
 *                 type: string
 *                 example: "1500"
 *     responses:
 *       200:
 *         description: Plan order submitted successfully
 *       400:
 *         description: Invalid request or insufficient balance
 *       500:
 *         description: Server error
 */
router.post('/futures/submit-plan-order', tokenRequired, submitFuturesPlanOrder);


// /**
//  * @swagger
//  * 
//  */
// router.get('/futures', tokenRequired, GetContractDetails);


module.exports = router;