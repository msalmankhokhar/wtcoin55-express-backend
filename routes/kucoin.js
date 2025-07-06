// const express = require('express');
// const router = express.Router();
// const {
//     // Market Data
//     getTradingPairs,
//     getAllCurrency,
//     getDepositAddress,
    
//     // Wallet Balances
//     getSpotWalletBalance,
//     getFuturesWalletBalance,
//     getAccountBalance,
//     getFuturesAccountBalance,
    
//     // Transfers
//     fundFuturesAccount,
//     futurestoSpotTransfer,
//     // withdrawToTradeWalletHandler,
    
//     // Spot Trading
//     submitSpotOrder,
//     getSpotOrderDetails,
//     getSpotTradingHistory,
//     cancelSpotOrder,
    
//     // Futures Trading
//     getFuturesContracts,
//     submitFuturesOrder,
//     getFuturesPositions,
//     getFuturesTradingHistory,
    
//     // Withdrawals
//     spotsWithdraw,
//     futuresWithdraw,
    
//     // History
//     getDepositHistory,
//     getWithdrawalHistory,
//     getWithdrawalQuota,
    
//     // Test/Debug
//     testSpotOrder,
//     getServerTime,
//     getServiceStatus
// } = require('../controllers/kucoin');

// const { tokenRequired } = require('../middleware/auth'); // Assuming you have auth middleware

// /**
//  * @swagger
//  * components:
//  *   securitySchemes:
//  *     quantumAccessToken:
//  *       type: http
//  *       scheme: bearer
//  *       bearerFormat: JWT
//  *   schemas:
//  *     Error:
//  *       type: object
//  *       properties:
//  *         error:
//  *           type: string
//  *         status:
//  *           type: boolean
//  *         message:
//  *           type: string
//  *     
//  *     TradingPair:
//  *       type: object
//  *       properties:
//  *         symbol:
//  *           type: string
//  *           example: "BTC-USDT"
//  *         name:
//  *           type: string
//  *           example: "BTC-USDT"
//  *         baseCurrency:
//  *           type: string
//  *           example: "BTC"
//  *         quoteCurrency:
//  *           type: string
//  *           example: "USDT"
//  *         feeCurrency:
//  *           type: string
//  *           example: "USDT"
//  *         market:
//  *           type: string
//  *           example: "USDS"
//  *         baseMinSize:
//  *           type: string
//  *           example: "0.00001"
//  *         quoteMinSize:
//  *           type: string
//  *           example: "0.01"
//  *         baseMaxSize:
//  *           type: string
//  *           example: "10000"
//  *         quoteMaxSize:
//  *           type: string
//  *           example: "99999999"
//  *         baseIncrement:
//  *           type: string
//  *           example: "0.00000001"
//  *         quoteIncrement:
//  *           type: string
//  *           example: "0.00001"
//  *         priceIncrement:
//  *           type: string
//  *           example: "0.1"
//  *         priceLimitRate:
//  *           type: string
//  *           example: "0.1"
//  *         isMarginEnabled:
//  *           type: boolean
//  *         enableTrading:
//  *           type: boolean
//  * 
//  *     Currency:
//  *       type: object
//  *       properties:
//  *         currency:
//  *           type: string
//  *           example: "BTC"
//  *         name:
//  *           type: string
//  *           example: "Bitcoin"
//  *         chains:
//  *           type: array
//  *           items:
//  *             type: object
//  *             properties:
//  *               chainName:
//  *                 type: string
//  *                 example: "BTC"
//  *               chainId:
//  *                 type: string
//  *                 example: "btc"
//  *         isDepositEnabled:
//  *           type: boolean
//  *         isWithdrawEnabled:
//  *           type: boolean
//  *         precision:
//  *           type: integer
//  *           example: 8
//  * 
//  *     SpotOrder:
//  *       type: object
//  *       properties:
//  *         symbol:
//  *           type: string
//  *           example: "BTC-USDT"
//  *         side:
//  *           type: string
//  *           enum: [buy, sell]
//  *           example: "buy"
//  *         type:
//  *           type: string
//  *           enum: [market, limit]
//  *           example: "limit"
//  *         quantity:
//  *           type: string
//  *           example: "0.001"
//  *         price:
//  *           type: string
//  *           example: "50000"
//  *         notional:
//  *           type: string
//  *           example: "50"
//  * 
//  *     FuturesOrder:
//  *       type: object
//  *       properties:
//  *         symbol:
//  *           type: string
//  *           example: "XBTUSDTM"
//  *         side:
//  *           type: string
//  *           enum: [buy, sell]
//  *           example: "buy"
//  *         type:
//  *           type: string
//  *           enum: [market, limit]
//  *           example: "limit"
//  *         size:
//  *           type: string
//  *           example: "1"
//  *         price:
//  *           type: string
//  *           example: "50000"
//  *         leverage:
//  *           type: integer
//  *           minimum: 1
//  *           maximum: 100
//  *           example: 10
//  * 
//  *     Transfer:
//  *       type: object
//  *       properties:
//  *         currency:
//  *           type: string
//  *           example: "USDT"
//  *         amount:
//  *           type: string
//  *           example: "100"
//  * 
//  *     Withdrawal:
//  *       type: object
//  *       properties:
//  *         coinId:
//  *           type: string
//  *           example: "BTC"
//  *         amount:
//  *           type: number
//  *           example: 0.001
//  * 
//  *     TradeWalletWithdrawal:
//  *       type: object
//  *       properties:
//  *         amount:
//  *           type: number
//  *           example: 100
//  *         destination:
//  *           type: string
//  *           enum: [spots, futures]
//  *           example: "spots"
//  *         coinId:
//  *           type: string
//  *           example: "USDT"
//  *         chain:
//  *           type: string
//  *           example: "TRX"
//  *         memo:
//  *           type: string
//  *           example: ""
//  */

// // ==================== MARKET DATA ROUTES ====================

// /**
//  * @swagger
//  * /api/kucoin/trading-pairs:
//  *   get:
//  *     summary: Get all trading pairs
//  *     description: Retrieve all available trading pairs on KuCoin spot market
//  *     tags: [KuCoin - Market Data]
//  *     responses:
//  *       200:
//  *         description: List of trading pairs
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: array
//  *               items:
//  *                 $ref: '#/components/schemas/TradingPair'
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get('/trading-pairs', getTradingPairs);

// /**
//  * @swagger
//  * /api/kucoin/currencies:
//  *   get:
//  *     summary: Get all currencies with pagination
//  *     description: Retrieve all available currencies for deposits and withdrawals
//  *     tags: [KuCoin - Market Data]
//  *     parameters:
//  *       - in: query
//  *         name: page
//  *         schema:
//  *           type: integer
//  *           minimum: 1
//  *           default: 1
//  *         description: Page number
//  *       - in: query
//  *         name: limit
//  *         schema:
//  *           type: integer
//  *           minimum: 1
//  *           maximum: 100
//  *           default: 20
//  *         description: Number of items per page
//  *     responses:
//  *       200:
//  *         description: Paginated list of currencies
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 data:
//  *                   type: array
//  *                   items:
//  *                     $ref: '#/components/schemas/Currency'
//  *                 meta:
//  *                   type: object
//  *                   properties:
//  *                     totalCount:
//  *                       type: integer
//  *                     currentPage:
//  *                       type: integer
//  *                     totalPages:
//  *                       type: integer
//  *                     prev:
//  *                       type: string
//  *                       nullable: true
//  *                     next:
//  *                       type: string
//  *                       nullable: true
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get('/currencies', getAllCurrency);

// /**
//  * @swagger
//  * /api/kucoin/deposit-history:
//  *   get:
//  *     summary: Get deposit history
//  *     description: Get user's deposit transaction history
//  *     tags: [KuCoin - History]
//  *     security:
//  *       - quantumAccessToken: []
//  *     parameters:
//  *       - in: query
//  *         name: currency
//  *         schema:
//  *           type: string
//  *           example: "BTC"
//  *         description: Currency symbol
//  *       - in: query
//  *         name: startTime
//  *         schema:
//  *           type: integer
//  *         description: Start timestamp in milliseconds
//  *       - in: query
//  *         name: endTime
//  *         schema:
//  *           type: integer
//  *         description: End timestamp in milliseconds
//  *       - in: query
//  *         name: limit
//  *         schema:
//  *           type: integer
//  *           minimum: 1
//  *           maximum: 500
//  *           default: 50
//  *         description: Number of records
//  *     responses:
//  *       200:
//  *         description: Deposit history records
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get('/deposit-history', tokenRequired, getDepositHistory);

// /**
//  * @swagger
//  * /api/kucoin/withdrawal-history:
//  *   get:
//  *     summary: Get withdrawal history
//  *     description: Get user's withdrawal transaction history
//  *     tags: [KuCoin - History]
//  *     security:
//  *       - quantumAccessToken: []
//  *     parameters:
//  *       - in: query
//  *         name: currency
//  *         schema:
//  *           type: string
//  *           example: "BTC"
//  *         description: Currency symbol
//  *       - in: query
//  *         name: startTime
//  *         schema:
//  *           type: integer
//  *         description: Start timestamp in milliseconds
//  *       - in: query
//  *         name: endTime
//  *         schema:
//  *           type: integer
//  *         description: End timestamp in milliseconds
//  *       - in: query
//  *         name: limit
//  *         schema:
//  *           type: integer
//  *           minimum: 1
//  *           maximum: 500
//  *           default: 50
//  *         description: Number of records
//  *     responses:
//  *       200:
//  *         description: Withdrawal history records
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get('/withdrawal-history', tokenRequired, getWithdrawalHistory);

// /**
//  * @swagger
//  * /api/kucoin/withdrawal-quota:
//  *   get:
//  *     summary: Get withdrawal quotas
//  *     description: Get withdrawal limits and fees for a currency
//  *     tags: [KuCoin - History]
//  *     security:
//  *       - quantumAccessToken: []
//  *     parameters:
//  *       - in: query
//  *         name: currency
//  *         required: true
//  *         schema:
//  *           type: string
//  *           example: "BTC"
//  *         description: Currency symbol
//  *       - in: query
//  *         name: chain
//  *         schema:
//  *           type: string
//  *           example: "BTC"
//  *         description: Chain name
//  *     responses:
//  *       200:
//  *         description: Withdrawal limits and fees
//  *       400:
//  *         description: Currency parameter required
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get('/withdrawal-quota', tokenRequired, getWithdrawalQuota);

// // ==================== TEST/DEBUG ROUTES ====================

// /**
//  * @swagger
//  * /api/kucoin/test-spot-order:
//  *   post:
//  *     summary: Test spot order functionality
//  *     description: Test and debug spot order status retrieval
//  *     tags: [KuCoin - Test/Debug]
//  *     security:
//  *       - quantumAccessToken: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               orderId:
//  *                 type: string
//  *                 example: "5c35c02703aa673ceec2a168"
//  *             required:
//  *               - orderId
//  *     responses:
//  *       200:
//  *         description: Order details for testing
//  *       400:
//  *         description: Order ID required
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.post('/test-spot-order', tokenRequired, testSpotOrder);

// /**
//  * @swagger
//  * /api/kucoin/server-time:
//  *   get:
//  *     summary: Get KuCoin server time
//  *     description: Get current server timestamp from KuCoin
//  *     tags: [KuCoin - Test/Debug]
//  *     responses:
//  *       200:
//  *         description: Server timestamp
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 code:
//  *                   type: string
//  *                   example: "200000"
//  *                 data:
//  *                   type: integer
//  *                   example: 1640995200000
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get('/server-time', getServerTime);

// /**
//  * @swagger
//  * /api/kucoin/service-status:
//  *   get:
//  *     summary: Get KuCoin service status
//  *     description: Check if KuCoin services are operational
//  *     tags: [KuCoin - Test/Debug]
//  *     responses:
//  *       200:
//  *         description: Service status information
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 code:
//  *                   type: string
//  *                   example: "200000"
//  *                 data:
//  *                   type: object
//  *                   properties:
//  *                     status:
//  *                       type: string
//  *                       example: "open"
//  *                     msg:
//  *                       type: string
//  *                       example: "upgrade match engine"
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get('/service-status', getServiceStatus);

// /**
//  * @swagger
//  *   get:
//  *     summary: Get deposit address
//  *     description: Get deposit address for a specific currency and chain
//  *     tags: [KuCoin - Market Data]
//  *     security:
//  *       - quantumAccessToken: []
//  *     parameters:
//  *       - in: query
//  *         name: currency
//  *         required: true
//  *         schema:
//  *           type: string
//  *           example: "BTC"
//  *         description: Currency symbol
//  *       - in: query
//  *         name: chain
//  *         schema:
//  *           type: string
//  *           example: "BTC"
//  *         description: Chain name (optional for multi-chain currencies)
//  *     responses:
//  *       200:
//  *         description: Deposit address information
//  *       400:
//  *         description: Currency parameter required
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get('/deposit-address', tokenRequired, getDepositAddress);

// // ==================== WALLET BALANCE ROUTES ====================

// /**
//  * @swagger
//  * /api/kucoin/spot-balance:
//  *   get:
//  *     summary: Get spot wallet balance
//  *     description: Get user's spot wallet balances from database
//  *     tags: [KuCoin - Wallet Balances]
//  *     security:
//  *       - quantumAccessToken: []
//  *     responses:
//  *       200:
//  *         description: Spot wallet balances
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get('/spot-balance', tokenRequired, getSpotWalletBalance);

// /**
//  * @swagger
//  * /api/kucoin/spot-balance/{coinId}:
//  *   get:
//  *     summary: Get specific spot wallet balance
//  *     description: Get user's specific coin balance in spot wallet
//  *     tags: [KuCoin - Wallet Balances]
//  *     security:
//  *       - quantumAccessToken: []
//  *     parameters:
//  *       - in: path
//  *         name: coinId
//  *         required: true
//  *         schema:
//  *           type: string
//  *           example: "BTC"
//  *         description: Coin ID
//  *     responses:
//  *       200:
//  *         description: Specific spot wallet balance
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get('/spot-balance/:coinId', tokenRequired, getSpotWalletBalance);

// /**
//  * @swagger
//  * /api/kucoin/futures-balance:
//  *   get:
//  *     summary: Get futures wallet balance
//  *     description: Get user's futures wallet balances from database
//  *     tags: [KuCoin - Wallet Balances]
//  *     security:
//  *       - quantumAccessToken: []
//  *     responses:
//  *       200:
//  *         description: Futures wallet balances
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get('/futures-balance', tokenRequired, getFuturesWalletBalance);

// /**
//  * @swagger
//  * /api/kucoin/futures-balance/{coinId}:
//  *   get:
//  *     summary: Get specific futures wallet balance
//  *     description: Get user's specific coin balance in futures wallet
//  *     tags: [KuCoin - Wallet Balances]
//  *     security:
//  *       - quantumAccessToken: []
//  *     parameters:
//  *       - in: path
//  *         name: coinId
//  *         required: true
//  *         schema:
//  *           type: string
//  *           example: "USDT"
//  *         description: Coin ID
//  *     responses:
//  *       200:
//  *         description: Specific futures wallet balance
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get('/futures-balance/:coinId', tokenRequired, getFuturesWalletBalance);

// /**
//  * @swagger
//  * /api/kucoin/account-balance:
//  *   get:
//  *     summary: Get live account balance from KuCoin
//  *     description: Get real-time account balance directly from KuCoin API
//  *     tags: [KuCoin - Wallet Balances]
//  *     security:
//  *       - quantumAccessToken: []
//  *     parameters:
//  *       - in: query
//  *         name: type
//  *         schema:
//  *           type: string
//  *           enum: [main, trade, margin]
//  *           example: "trade"
//  *         description: Account type
//  *       - in: query
//  *         name: currency
//  *         schema:
//  *           type: string
//  *           example: "USDT"
//  *         description: Specific currency
//  *     responses:
//  *       200:
//  *         description: Live account balance
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get('/account-balance', tokenRequired, getAccountBalance);

// /**
//  * @swagger
//  * /api/kucoin/futures-account-balance:
//  *   get:
//  *     summary: Get live futures account balance
//  *     description: Get real-time futures account balance from KuCoin API
//  *     tags: [KuCoin - Wallet Balances]
//  *     security:
//  *       - quantumAccessToken: []
//  *     responses:
//  *       200:
//  *         description: Live futures account balance
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get('/futures-account-balance', tokenRequired, getFuturesAccountBalance);

// // ==================== TRANSFER ROUTES ====================

// /**
//  * @swagger
//  * /api/kucoin/fund-futures:
//  *   post:
//  *     summary: Transfer funds from spot to futures
//  *     description: Transfer funds from spot wallet to futures wallet
//  *     tags: [KuCoin - Transfers]
//  *     security:
//  *       - quantumAccessToken: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             $ref: '#/components/schemas/Transfer'
//  *     responses:
//  *       200:
//  *         description: Transfer successful
//  *       400:
//  *         description: Invalid request or insufficient balance
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.post('/fund-futures', tokenRequired, fundFuturesAccount);

// /**
//  * @swagger
//  * /api/kucoin/futures-to-spot:
//  *   post:
//  *     summary: Transfer funds from futures to spot
//  *     description: Transfer funds from futures wallet to spot wallet
//  *     tags: [KuCoin - Transfers]
//  *     security:
//  *       - quantumAccessToken: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             $ref: '#/components/schemas/Transfer'
//  *     responses:
//  *       200:
//  *         description: Transfer successful
//  *       400:
//  *         description: Invalid request or insufficient balance
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.post('/futures-to-spot', tokenRequired, futurestoSpotTransfer);

// // /**
// //  * @swagger
// //  * /api/kucoin/withdraw-to-trade-wallet:
// //  *   post:
// //  *     summary: Withdraw from main wallet to trading wallet
// //  *     description: Withdraw funds from main wallet to KuCoin trading wallet (spots or futures)
// //  *     tags: [KuCoin - Transfers]
// //  *     security:
// //  *       - quantumAccessToken: []
// //  *     requestBody:
// //  *       required: true
// //  *       content:
// //  *         application/json:
// //  *           schema:
// //  *             $ref: '#/components/schemas/TradeWalletWithdrawal'
// //  *     responses:
// //  *       200:
// //  *         description: Withdrawal successful
// //  *         content:
// //  *           application/json:
// //  *             schema:
// //  *               type: object
// //  *               properties:
// //  *                 status:
// //  *                   type: boolean
// //  *                   example: true
// //  *                 message:
// //  *                   type: string
// //  *                   example: "Withdrawal applied successfully"
// //  *                 data:
// //  *                   type: object
// //  *       400:
// //  *         description: Invalid request or insufficient balance
// //  *         content:
// //  *           application/json:
// //  *             schema:
// //  *               type: object
// //  *               properties:
// //  *                 status:
// //  *                   type: boolean
// //  *                   example: false
// //  *                 message:
// //  *                   type: string
// //  *                 error:
// //  *                   type: string
// //  *       500:
// //  *         description: Server error
// //  *         content:
// //  *           application/json:
// //  *             schema:
// //  *               type: object
// //  *               properties:
// //  *                 status:
// //  *                   type: boolean
// //  *                   example: false
// //  *                 message:
// //  *                   type: string
// //  *                   example: "Internal server error"
// //  *                 error:
// //  *                   type: string
// //  */
// // router.post('/withdraw-to-trade-wallet', tokenRequired, withdrawToTradeWalletHandler);

// // ==================== SPOT TRADING ROUTES ====================

// /**
//  * @swagger
//  * /api/kucoin/spot-order:
//  *   post:
//  *     summary: Submit spot order
//  *     description: Place a buy or sell order on KuCoin spot market
//  *     tags: [KuCoin - Spot Trading]
//  *     security:
//  *       - quantumAccessToken: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             $ref: '#/components/schemas/SpotOrder'
//  *     responses:
//  *       200:
//  *         description: Order placed successfully
//  *       400:
//  *         description: Invalid order parameters
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.post('/spot-order', tokenRequired, submitSpotOrder);

// /**
//  * @swagger
//  * /api/kucoin/spot-order/{orderId}:
//  *   get:
//  *     summary: Get spot order details
//  *     description: Get details of a specific spot order
//  *     tags: [KuCoin - Spot Trading]
//  *     security:
//  *       - quantumAccessToken: []
//  *     parameters:
//  *       - in: path
//  *         name: orderId
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Order ID
//  *     responses:
//  *       200:
//  *         description: Order details
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  *   delete:
//  *     summary: Cancel spot order
//  *     description: Cancel a pending spot order
//  *     tags: [KuCoin - Spot Trading]
//  *     security:
//  *       - quantumAccessToken: []
//  *     parameters:
//  *       - in: path
//  *         name: orderId
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Order ID to cancel
//  *     responses:
//  *       200:
//  *         description: Order cancelled successfully
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get('/spot-order/:orderId', tokenRequired, getSpotOrderDetails);
// router.delete('/spot-order/:orderId', tokenRequired, cancelSpotOrder);

// /**
//  * @swagger
//  * /api/kucoin/spot-trades:
//  *   get:
//  *     summary: Get spot trading history
//  *     description: Get user's spot trading history and filled orders
//  *     tags: [KuCoin - Spot Trading]
//  *     security:
//  *       - quantumAccessToken: []
//  *     parameters:
//  *       - in: query
//  *         name: symbol
//  *         schema:
//  *           type: string
//  *           example: "BTC-USDT"
//  *         description: Trading symbol
//  *       - in: query
//  *         name: startTime
//  *         schema:
//  *           type: integer
//  *         description: Start timestamp
//  *       - in: query
//  *         name: endTime
//  *         schema:
//  *           type: integer
//  *         description: End timestamp
//  *       - in: query
//  *         name: limit
//  *         schema:
//  *           type: integer
//  *           minimum: 1
//  *           maximum: 500
//  *           default: 10
//  *         description: Number of records
//  *     responses:
//  *       200:
//  *         description: Trading history
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get('/spot-trades', tokenRequired, getSpotTradingHistory);

// // ==================== FUTURES TRADING ROUTES ====================

// /**
//  * @swagger
//  * /api/kucoin/futures-contracts:
//  *   get:
//  *     summary: Get futures contracts
//  *     description: Get all available futures contracts
//  *     tags: [KuCoin - Futures Trading]
//  *     responses:
//  *       200:
//  *         description: List of futures contracts
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get('/futures-contracts', getFuturesContracts);

// /**
//  * @swagger
//  * /api/kucoin/futures-order:
//  *   post:
//  *     summary: Submit futures order
//  *     description: Place a leveraged order on KuCoin futures market
//  *     tags: [KuCoin - Futures Trading]
//  *     security:
//  *       - quantumAccessToken: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             $ref: '#/components/schemas/FuturesOrder'
//  *     responses:
//  *       200:
//  *         description: Futures order placed successfully
//  *       400:
//  *         description: Invalid order parameters
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.post('/futures-order', tokenRequired, submitFuturesOrder);

// /**
//  * @swagger
//  * /api/kucoin/futures-positions:
//  *   get:
//  *     summary: Get futures positions
//  *     description: Get current futures positions
//  *     tags: [KuCoin - Futures Trading]
//  *     security:
//  *       - quantumAccessToken: []
//  *     parameters:
//  *       - in: query
//  *         name: symbol
//  *         schema:
//  *           type: string
//  *           example: "XBTUSDTM"
//  *         description: Contract symbol
//  *     responses:
//  *       200:
//  *         description: Current futures positions
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get('/futures-positions', tokenRequired, getFuturesPositions);

// /**
//  * @swagger
//  * /api/kucoin/futures-trades:
//  *   get:
//  *     summary: Get futures trading history
//  *     description: Get user's futures trading history
//  *     tags: [KuCoin - Futures Trading]
//  *     security:
//  *       - quantumAccessToken: []
//  *     parameters:
//  *       - in: query
//  *         name: symbol
//  *         schema:
//  *           type: string
//  *           example: "XBTUSDTM"
//  *         description: Contract symbol
//  *       - in: query
//  *         name: startAt
//  *         schema:
//  *           type: integer
//  *         description: Start timestamp
//  *       - in: query
//  *         name: endAt
//  *         schema:
//  *           type: integer
//  *         description: End timestamp
//  *       - in: query
//  *         name: currentPage
//  *         schema:
//  *           type: integer
//  *           minimum: 1
//  *           default: 1
//  *         description: Page number
//  *       - in: query
//  *         name: pageSize
//  *         schema:
//  *           type: integer
//  *           minimum: 1
//  *           maximum: 500
//  *           default: 50
//  *         description: Page size
//  *     responses:
//  *       200:
//  *         description: Futures trading history
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get('/futures-trades', tokenRequired, getFuturesTradingHistory);

// // ==================== WITHDRAWAL ROUTES ====================

// /**
//  * @swagger
//  * /api/kucoin/spot-withdraw:
//  *   post:
//  *     summary: Withdraw from spot wallet
//  *     description: Withdraw funds from spot wallet to external address
//  *     tags: [KuCoin - Withdrawals]
//  *     security:
//  *       - quantumAccessToken: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             $ref: '#/components/schemas/Withdrawal'
//  *     responses:
//  *       200:
//  *         description: Withdrawal initiated successfully
//  *       400:
//  *         description: Invalid request or insufficient balance
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.post('/spot-withdraw', tokenRequired, spotsWithdraw);

// /**
//  * @swagger
//  * /api/kucoin/futures-withdraw:
//  *   post:
//  *     summary: Withdraw from futures wallet
//  *     description: Withdraw funds from futures wallet to external address
//  *     tags: [KuCoin - Withdrawals]
//  *     security:
//  *       - quantumAccessToken: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             $ref: '#/components/schemas/Withdrawal'
//  *     responses:
//  *       200:
//  *         description: Withdrawal initiated successfully
//  *       400:
//  *         description: Invalid request or insufficient balance
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  *       500:
//  *         description: Server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.post('/futures-withdraw', tokenRequired, futuresWithdraw);




// module.exports = router;