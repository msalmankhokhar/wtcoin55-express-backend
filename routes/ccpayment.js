let express = require('express');
const { getAppCoinListHandler, getOrCreateAppDepositAddressHandler, getChainListHandler, 
    getAppCoinAssetListHandler, getAppCoinAssetHandler, getAppDepositRecordListHandler, 
    applyAppWithdrawToNetworkHandler, withdrawToDerivativeWalletHandler } = require('../controllers/ccpayment');

const { tokenRequired } = require('../middleware/auth');

let router = express.Router();

/**
 * @swagger
 * /api/ccpayment/coins:
 *   get:
 *     summary: Retrieve supported coin list from CCPayment
 *     tags: [Crypto]
 *     responses:
 *       200:
 *         description: List of supported coins
 *       500:
 *         description: Server error
 */
router.get('/coins', tokenRequired, getAppCoinListHandler);


/**
 * @swagger
 * /api/ccpayment/deposit-address:
 *   post:
 *     summary: Get or create a deposit address for a specific coin
 *     tags: [Crypto]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               coinId:
 *                 type: string
 *                 example: BTC
 *     responses:
 *       200:
 *         description: Deposit address retrieved successfully
 *       400:
 *         description: Missing parameters
 *       500:
 *         description: Server error
 */
router.post('/deposit-address', tokenRequired, getOrCreateAppDepositAddressHandler);


/**
 * @swagger
 * /api/ccpayment/chains:
 *   post:
 *     summary: Retrieve supported chain list for specific coins
 *     tags: [Crypto]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chains:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["BTC", "ETH"]
 *     responses:
 *       200:
 *         description: Chain list fetched
 *       500:
 *         description: Server error
 */
router.post('/chains', tokenRequired, getChainListHandler);


/**
 * @swagger
 * /api/ccpayment/assets:
 *   get:
 *     summary: Get the list of coin assets in the app
 *     tags: [Crypto]
 *     responses:
 *       200:
 *         description: Asset list retrieved
 *       500:
 *         description: Server error
 */
router.get('/assets', tokenRequired, getAppCoinAssetListHandler);


/**
 * @swagger
 * /api/ccpayment/asset:
 *   post:
 *     summary: Get specific app coin asset details
 *     tags: [Crypto]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               coinId:
 *                 type: string
 *                 example: BTC
 *     responses:
 *       200:
 *         description: Coin asset details
 *       500:
 *         description: Server error
 */
router.post('/asset', tokenRequired, getAppCoinAssetHandler);


/**
 * @swagger
 * /api/ccpayment/deposit-records:
 *   get:
 *     summary: Get a list of deposit records
 *     tags: [Crypto]
 *     responses:
 *       200:
 *         description: Deposit records retrieved
 *       500:
 *         description: Server error
 */
router.get('/deposit-records', tokenRequired, getAppDepositRecordListHandler);


/**
 * @swagger
 * /api/ccpayment/withdraw:
 *   post:
 *     summary: Apply for a crypto withdrawal to network
 *     tags: [Crypto]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - coinId
 *               - address
 *               - amount
 *               - chain
 *             properties:
 *               coinId:
 *                 type: string
 *               address:
 *                 type: string
 *               amount:
 *                 type: number
 *               chain:
 *                 type: string
 *               memo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Withdrawal initiated
 *       400:
 *         description: Insufficient balance or invalid data
 *       500:
 *         description: Server error
 */
router.post('/withdraw', tokenRequired, applyAppWithdrawToNetworkHandler);


/**
 * @swagger
 * /api/ccpayment/withdraw/trading:
 *   post:
 *     summary: Withdraw from main balance to either spot or futures wallet
 *     tags: [Crypto]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - destination
 *             properties:
 *               amount:
 *                 type: number
 *               destination:
 *                 type: string
 *                 enum: [spots, futures]
 *               memo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Derivatives withdrawal successful
 *       400:
 *         description: Invalid destination or insufficient balance
 *       500:
 *         description: Server error
 */
router.post('/withdraw/trading', tokenRequired, withdrawToDerivativeWalletHandler);


module.exports = router;