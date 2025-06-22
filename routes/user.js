let express = require('express');
const { getProfile, getBalance, transactionHistory, getUserBalances, getUserTradingVolumeStatus, kycVerificationSubmission } = require('../controllers/user');
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
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - city
 *               - country
 *               - idNumber
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
 *           examples:
 *             example1:
 *               summary: Standard KYC submission
 *               value:
 *                 fullName: "John Michael Smith"
 *                 city: "New York"
 *                 country: "United States"
 *                 idNumber: "123456789"
 *             example2:
 *               summary: International user
 *               value:
 *                 fullName: "Maria García López"
 *                 city: "Madrid"
 *                 country: "Spain"
 *                 idNumber: "ES12345678A"
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
