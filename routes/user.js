let express = require('express');
const { getProfile, getBalance, transactionHistory, depositTransactionHistory, withdrawTransactionHistory, getUserBalances, getUserTradingVolumeStatus, kycVerificationSubmission } = require('../controllers/user');
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
 * /api/user/transactions/deposits:
 *   get:
 *     summary: Retrieve the user's deposit transaction history
 *     description: Get all deposit transactions for the authenticated user. This includes all successful deposits made to the user's account.
 *     tags: [User]
 *     security:
 *       - quantumAccessToken: []
 *     responses:
 *       200:
 *         description: Successfully retrieved deposit transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: "success"
 *                 transactions:
 *                   type: array
 *                   description: Array of deposit transaction objects
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Transaction ID
 *                         example: "507f1f77bcf86cd799439011"
 *                       user:
 *                         type: string
 *                         description: User ID
 *                         example: "507f1f77bcf86cd799439012"
 *                       type:
 *                         type: string
 *                         description: Transaction type
 *                         example: "deposit"
 *                       amount:
 *                         type: number
 *                         description: Transaction amount
 *                         example: 100.50
 *                       coinName:
 *                         type: string
 *                         description: Cryptocurrency name
 *                         example: "USDT"
 *                       status:
 *                         type: string
 *                         description: Transaction status
 *                         example: "completed"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Transaction creation timestamp
 *                         example: "2023-12-01T10:30:00.000Z"
 *             example:
 *               msg: "success"
 *               transactions: [
 *                 {
 *                   _id: "507f1f77bcf86cd799439011",
 *                   user: "507f1f77bcf86cd799439012",
 *                   type: "deposit",
 *                   amount: 100.50,
 *                   coinName: "USDT",
 *                   status: "completed",
 *                   createdAt: "2023-12-01T10:30:00.000Z"
 *                 }
 *               ]
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
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
 *                 error:
 *                   type: string
 *                   example: "Internal Server Error"
 */
router.get('/transactions/deposits', tokenRequired, depositTransactionHistory);

/**
 * @swagger
 * /api/user/transactions/withdrawals:
 *   get:
 *     summary: Retrieve the user's withdrawal transaction history
 *     description: Get all withdrawal transactions for the authenticated user. This includes all withdrawal requests and their current status.
 *     tags: [User]
 *     security:
 *       - quantumAccessToken: []
 *     responses:
 *       200:
 *         description: Successfully retrieved withdrawal transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: "success"
 *                 transactions:
 *                   type: array
 *                   description: Array of withdrawal transaction objects
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Transaction ID
 *                         example: "507f1f77bcf86cd799439013"
 *                       user:
 *                         type: string
 *                         description: User ID
 *                         example: "507f1f77bcf86cd799439012"
 *                       type:
 *                         type: string
 *                         description: Transaction type
 *                         example: "withdraw"
 *                       amount:
 *                         type: number
 *                         description: Transaction amount
 *                         example: 50.25
 *                       coinName:
 *                         type: string
 *                         description: Cryptocurrency name
 *                         example: "USDT"
 *                       status:
 *                         type: string
 *                         description: Transaction status
 *                         example: "pending"
 *                       address:
 *                         type: string
 *                         description: Destination wallet address
 *                         example: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Transaction creation timestamp
 *                         example: "2023-12-01T10:30:00.000Z"
 *             example:
 *               msg: "success"
 *               transactions: [
 *                 {
 *                   _id: "507f1f77bcf86cd799439013",
 *                   user: "507f1f77bcf86cd799439012",
 *                   type: "withdraw",
 *                   amount: 50.25,
 *                   coinName: "USDT",
 *                   status: "pending",
 *                   address: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
 *                   createdAt: "2023-12-01T10:30:00.000Z"
 *                 }
 *               ]
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
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
 *                 error:
 *                   type: string
 *                   example: "Internal Server Error"
 */
router.get('/transactions/withdrawals', tokenRequired, withdrawTransactionHistory);

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

/**
 * @swagger
 * /api/user/kyc-verification:
 *   post:
 *     summary: Submit KYC (Know Your Customer) verification
 *     description: Submit personal identification information for KYC verification. This is required for compliance and security purposes.
 *     tags: [User]
 *     security:
 *       - quantumAccessToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - city
 *               - country
 *               - idNumber
 *               - frontImage
 *               - backImage
 *               - idImage
 *             properties:
 *               fullName:
 *                 type: string
 *                 description: Full legal name as it appears on official identification
 *                 example: "John Michael Smith"
 *                 minLength: 2
 *                 maxLength: 100
 *               city:
 *                 type: string
 *                 description: City of residence
 *                 example: "New York"
 *                 minLength: 2
 *                 maxLength: 50
 *               country:
 *                 type: string
 *                 description: Country of residence
 *                 example: "United States"
 *                 minLength: 2
 *                 maxLength: 50
 *               idNumber:
 *                 type: string
 *                 description: Government-issued identification number (passport, national ID, driver's license, etc.)
 *                 example: "123456789"
 *                 minLength: 5
 *                 maxLength: 50
 *               frontImage:
 *                 type: string
 *                 format: binary
 *                 description: Image file of the user's front of the identification document (JPG, PNG, PDF accepted)
 *               backImage:
 *                 type: string
 *                 format: binary
 *                 description: Image file of the user's back of the identification document (JPG, PNG, PDF accepted)
 *               idImage:
 *                 type: string
 *                 format: binary
 *                 description: Image file of the user holding the identification document (JPG, PNG, PDF accepted)
 *           examples:
 *             example1:
 *               summary: Standard KYC submission
 *               value:
 *                 fullName: "John Michael Smith"
 *                 city: "New York"
 *                 country: "United States"
 *                 idNumber: "123456789"
 *                 frontImage: "(binary)"
 *                 backImage: "(binary)"
 *                 idImage: "(binary)"
 *             example2:
 *               summary: International user
 *               value:
 *                 fullName: "Maria García López"
 *                 city: "Madrid"
 *                 country: "Spain"
 *                 idNumber: "ES12345678A"
 *                 frontImage: "(binary)"
 *                 backImage: "(binary)"
 *                 idImage: "(binary)"
 *     responses:
 *       200:
 *         description: KYC verification submitted successfully
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
 *                   example: "KYC verification submitted successfully"
 *             example:
 *               success: true
 *               message: "KYC verification submitted successfully"
 *       400:
 *         description: Bad request - validation error or already submitted
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
 *                   oneOf:
 *                     - "All fields are required: fullName, city, country, idNumber"
 *                     - "KYC verification already submitted"
 *             examples:
 *               missingFields:
 *                 summary: Missing required fields
 *                 value:
 *                   success: false
 *                   message: "All fields are required: fullName, city, country, idNumber"
 *               alreadySubmitted:
 *                 summary: KYC already submitted
 *                 value:
 *                   success: false
 *                   message: "KYC verification already submitted"
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
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
 *                 message:
 *                   type: string
 *                   example: "Failed to submit KYC verification"
 */
router.post('/kyc-verification', tokenRequired, kycVerificationSubmission);

module.exports = router;
