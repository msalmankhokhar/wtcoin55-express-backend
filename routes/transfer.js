const express = require('express');
const router = express.Router();
const { transferToTrade, transferToExchange, transferBetweenTradeAccounts, getTransferHistory, getTradingVolumeStatus } = require('../controllers/transfer');
const { tokenRequired } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     TransferToTradeRequest:
 *       type: object
 *       required:
 *         - amount
 *         - destination
 *         - coinId
 *         - coinName
 *       properties:
 *         amount:
 *           type: number
 *           description: Amount to transfer
 *           example: 100.50
 *         destination:
 *           type: string
 *           enum: [spot, futures]
 *           description: Destination account type
 *           example: "spot"
 *         coinId:
 *           type: integer
 *           description: Coin ID
 *           example: 1280
 *         coinName:
 *           type: string
 *           description: Coin name
 *           example: "USDT"
 *     
 *     TransferToExchangeRequest:
 *       type: object
 *       required:
 *         - amount
 *         - source
 *         - coinId
 *         - coinName
 *       properties:
 *         amount:
 *           type: number
 *           description: Amount to transfer
 *           example: 50.25
 *         source:
 *           type: string
 *           enum: [spot, futures]
 *           description: Source account type
 *           example: "spot"
 *         coinId:
 *           type: integer
 *           description: Coin ID
 *           example: 1280
 *         coinName:
 *           type: string
 *           description: Coin name
 *           example: "USDT"
 *     
 *     TransferResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Successfully transferred 100.50 USDT to spot account"
 *         data:
 *           type: object
 *           properties:
 *             transferId:
 *               type: string
 *               description: Transfer ID
 *               example: "507f1f77bcf86cd799439011"
 *             amount:
 *               type: number
 *               example: 100.50
 *             netAmount:
 *               type: number
 *               description: Amount after fees (for trade to exchange)
 *               example: 90.45
 *             fee:
 *               type: number
 *               description: Fee amount (for trade to exchange)
 *               example: 10.05
 *             feeType:
 *               type: string
 *               description: Type of fee applied
 *               example: "withdrawal_fee"
 *             volumeMet:
 *               type: boolean
 *               description: Whether trading volume requirement is met
 *               example: true
 *             requiredVolume:
 *               type: number
 *               description: Required trading volume
 *               example: 10050
 *             currentVolume:
 *               type: number
 *               description: Current trading volume
 *               example: 12000
 *             destination:
 *               type: string
 *               example: "spot"
 *             status:
 *               type: string
 *               example: "completed"
 *     
 *     TransferHistory:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         user:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
 *         fromAccount:
 *           type: string
 *           example: "exchange"
 *         toAccount:
 *           type: string
 *           example: "spot"
 *         coinId:
 *           type: integer
 *           example: 1280
 *         coinName:
 *           type: string
 *           example: "USDT"
 *         amount:
 *           type: number
 *           example: 100.50
 *         fee:
 *           type: number
 *           example: 10.05
 *         feeType:
 *           type: string
 *           example: "withdrawal_fee"
 *         netAmount:
 *           type: number
 *           example: 90.45
 *         requiredVolume:
 *           type: number
 *           example: 10050
 *         currentVolume:
 *           type: number
 *           example: 12000
 *         volumeMet:
 *           type: boolean
 *           example: true
 *         status:
 *           type: string
 *           example: "completed"
 *         transferType:
 *           type: string
 *           example: "exchange_to_trade"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *     
 *     VolumeStatus:
 *       type: object
 *       properties:
 *         totalRequiredVolume:
 *           type: number
 *           description: Total required trading volume
 *           example: 10050
 *         currentVolume:
 *           type: number
 *           description: Current trading volume achieved
 *           example: 12000
 *         volumeMet:
 *           type: boolean
 *           description: Whether volume requirement is met
 *           example: true
 *         remainingVolume:
 *           type: number
 *           description: Remaining volume needed
 *           example: 0
 *         withdrawalFee:
 *           type: number
 *           description: Fee percentage if volume is met
 *           example: 0.10
 *         penaltyFee:
 *           type: number
 *           description: Fee percentage if volume is not met
 *           example: 0.20
 *     
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Missing required fields"
 *         error:
 *           type: string
 *           example: "Validation error"
 *   
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/transfer/to-trade:
 *   post:
 *     summary: Transfer funds from Exchange to Trade account
 *     description: Transfer funds from the main exchange balance to either spot or futures trading account
 *     tags: [Transfer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransferToTradeRequest'
 *           examples:
 *             spot_transfer:
 *               summary: Transfer to spot account
 *               value:
 *                 amount: 100.50
 *                 destination: "spot"
 *                 coinId: 1280
 *                 coinName: "USDT"
 *             futures_transfer:
 *               summary: Transfer to futures account
 *               value:
 *                 amount: 250.00
 *                 destination: "futures"
 *                 coinId: 1280
 *                 coinName: "USDT"
 *     responses:
 *       200:
 *         description: Transfer successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransferResponse'
 *             examples:
 *               success_response:
 *                 summary: Successful transfer response
 *                 value:
 *                   success: true
 *                   message: "Successfully transferred 100.50 USDT to spot account"
 *                   data:
 *                     transferId: "507f1f77bcf86cd799439011"
 *                     amount: 100.50
 *                     coinName: "USDT"
 *                     destination: "spot"
 *                     requiredVolume: 10050
 *                     status: "completed"
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missing_fields:
 *                 summary: Missing required fields
 *                 value:
 *                   success: false
 *                   message: "Missing required fields: amount, destination, coinId, coinName"
 *               insufficient_balance:
 *                 summary: Insufficient balance
 *                 value:
 *                   success: false
 *                   message: "Insufficient balance in Exchange account"
 *               invalid_destination:
 *                 summary: Invalid destination
 *                 value:
 *                   success: false
 *                   message: "Invalid destination. Must be spot or futures"
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/transfer/to-exchange:
 *   post:
 *     summary: Transfer funds from Trade account to Exchange
 *     description: Transfer funds from spot or futures trading account back to the main exchange balance. Fees apply based on trading volume requirements.
 *     tags: [Transfer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransferToExchangeRequest'
 *           examples:
 *             spot_withdrawal:
 *               summary: Withdraw from spot account
 *               value:
 *                 amount: 50.25
 *                 source: "spot"
 *                 coinId: 1280
 *                 coinName: "USDT"
 *             futures_withdrawal:
 *               summary: Withdraw from futures account
 *               value:
 *                 amount: 150.00
 *                 source: "futures"
 *                 coinId: 1280
 *                 coinName: "USDT"
 *     responses:
 *       200:
 *         description: Transfer successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransferResponse'
 *             examples:
 *               success_with_fee:
 *                 summary: Successful transfer with fee
 *                 value:
 *                   success: true
 *                   message: "Successfully transferred 50.25 USDT from spot to Exchange"
 *                   data:
 *                     transferId: "507f1f77bcf86cd799439011"
 *                     amount: 50.25
 *                     netAmount: 45.23
 *                     fee: 5.02
 *                     feeType: "withdrawal_fee"
 *                     volumeMet: true
 *                     requiredVolume: 5025
 *                     currentVolume: 6000
 *                     status: "completed"
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               insufficient_balance:
 *                 summary: Insufficient balance
 *                 value:
 *                   success: false
 *                   message: "Insufficient balance in spot account"
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/transfer/between-trade-accounts:
 *   post:
 *     summary: Transfer funds between Trade accounts
 *     description: Transfer funds between spot and futures trading accounts. Fees apply based on trading volume requirements of the source account.
 *     tags: [Transfer]
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
 *               - fromAccount
 *               - toAccount
 *               - coinId
 *               - coinName
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to transfer
 *                 example: 100.50
 *               fromAccount:
 *                 type: string
 *                 enum: [spot, futures]
 *                 description: Source account type
 *                 example: "spot"
 *               toAccount:
 *                 type: string
 *                 enum: [spot, futures]
 *                 description: Destination account type
 *                 example: "futures"
 *               coinId:
 *                 type: integer
 *                 description: Coin ID
 *                 example: 1280
 *               coinName:
 *                 type: string
 *                 description: Coin name
 *                 example: "USDT"
 *           examples:
 *             spot_to_futures:
 *               summary: Transfer from spot to futures
 *               value:
 *                 amount: 100.50
 *                 fromAccount: "spot"
 *                 toAccount: "futures"
 *                 coinId: 1280
 *                 coinName: "USDT"
 *             futures_to_spot:
 *               summary: Transfer from futures to spot
 *               value:
 *                 amount: 75.25
 *                 fromAccount: "futures"
 *                 toAccount: "spot"
 *                 coinId: 1280
 *                 coinName: "USDT"
 *     responses:
 *       200:
 *         description: Transfer successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransferResponse'
 *             examples:
 *               success_with_fee:
 *                 summary: Successful transfer with penalty fee
 *                 value:
 *                   success: true
 *                   message: "Successfully transferred 80.40 USDT from spot to futures"
 *                   data:
 *                     transferId: "507f1f77bcf86cd799439011"
 *                     amount: 100.50
 *                     netAmount: 80.40
 *                     fee: 20.10
 *                     feeType: "penalty_fee"
 *                     volumeMet: false
 *                     requiredVolume: 10050
 *                     currentVolume: 5000
 *                     status: "completed"
 *               success_no_fee:
 *                 summary: Successful transfer without fee
 *                 value:
 *                   success: true
 *                   message: "Successfully transferred 100.50 USDT from spot to futures"
 *                   data:
 *                     transferId: "507f1f77bcf86cd799439011"
 *                     amount: 100.50
 *                     netAmount: 100.50
 *                     fee: 0
 *                     feeType: "no_fee"
 *                     volumeMet: true
 *                     requiredVolume: 10050
 *                     currentVolume: 12000
 *                     status: "completed"
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missing_fields:
 *                 summary: Missing required fields
 *                 value:
 *                   success: false
 *                   message: "Missing required fields: amount, fromAccount, toAccount, coinId, coinName"
 *               insufficient_balance:
 *                 summary: Insufficient balance
 *                 value:
 *                   success: false
 *                   message: "Insufficient balance in spot account"
 *               invalid_accounts:
 *                 summary: Invalid account types
 *                 value:
 *                   success: false
 *                   message: "Invalid account type. Must be spot or futures"
 *               same_account:
 *                 summary: Same account transfer
 *                 value:
 *                   success: false
 *                   message: "Cannot transfer to the same account type"
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/transfer/history:
 *   get:
 *     summary: Get transfer history
 *     description: Retrieve all transfer history for the authenticated user
 *     tags: [Transfer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transfer history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TransferHistory'
 *             examples:
 *               history_response:
 *                 summary: Transfer history response
 *                 value:
 *                   success: true
 *                   data:
 *                     - _id: "507f1f77bcf86cd799439011"
 *                       user: "507f1f77bcf86cd799439012"
 *                       fromAccount: "exchange"
 *                       toAccount: "spot"
 *                       coinId: 1280
 *                       coinName: "USDT"
 *                       amount: 100.50
 *                       netAmount: 100.50
 *                       requiredVolume: 10050
 *                       status: "completed"
 *                       transferType: "exchange_to_trade"
 *                       createdAt: "2024-01-15T10:30:00.000Z"
 *                       updatedAt: "2024-01-15T10:30:00.000Z"
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/transfer/volume-status:
 *   get:
 *     summary: Get trading volume status
 *     description: Get the trading volume status for a specific account type and coin to determine withdrawal fees
 *     tags: [Transfer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: accountType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [spot, futures]
 *         description: Account type to check volume status for
 *         example: "spot"
 *       - in: query
 *         name: coinId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Coin ID to check volume status for
 *         example: 1280
 *     responses:
 *       200:
 *         description: Volume status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/VolumeStatus'
 *             examples:
 *               volume_status_response:
 *                 summary: Volume status response
 *                 value:
 *                   success: true
 *                   data:
 *                     totalRequiredVolume: 10050
 *                     currentVolume: 12000
 *                     volumeMet: true
 *                     remainingVolume: 0
 *                     withdrawalFee: 0.10
 *                     penaltyFee: 0.20
 *       400:
 *         description: Bad request - missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missing_params:
 *                 summary: Missing required parameters
 *                 value:
 *                   success: false
 *                   message: "accountType and coinId are required"
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// Transfer from Exchange to Trade (spot/futures)
router.post('/to-trade', tokenRequired, transferToTrade);

// Transfer from Trade (spot/futures) to Exchange
router.post('/to-exchange', tokenRequired, transferToExchange);

// Transfer between Trade accounts (spot to futures or futures to spot)
router.post('/between-trade-accounts', tokenRequired, transferBetweenTradeAccounts);

// Get transfer history
router.get('/history', tokenRequired, getTransferHistory);

// Get trading volume status
router.get('/volume-status', tokenRequired, getTradingVolumeStatus);

module.exports = router; 