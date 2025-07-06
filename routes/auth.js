let express = require('express');
const { Signup, loginUser, forgotPassword, resetPassword, GetVerificationCode, sendPhoneOTP, verifyPhoneOTP } = require('../controllers/auth');
const { signupValidator, loginValidator, EmailValidator, resetPasswordValidator } = require('../middleware/validators');
const { tokenRequired } = require('../middleware/auth');
let router = express.Router();


/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phonenumber:
 *                 type: string
 *               password:
 *                 type: string
 *               verificationCode:
 *                 type: string
 *               referBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent to your email. Please verify to complete registration.
 *       400:
 *         description: Validation error or missing fields.
 *       500:
 *         description: Internal Server Error.
 */
router.post('/signup', signupValidator, Signup);

/**
 * @swagger
 * /api/auth/get-verification-code:
 *   post:
 *     summary: Request a verification code for email or phone number
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phonenumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent to your email or phone.
 *       400:
 *         description: Email or Phonenumber is required.
 *       500:
 *         description: Server error.
 */
router.post('/get-verification-code', EmailValidator, GetVerificationCode);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: OTP sent to your email. Purpose is to reset password.
 *       400:
 *         description: Validation error.
 *       404:
 *         description: Email does not exist.
 *       500:
 *         description: Server error.
 */
router.post('/forgot-password', EmailValidator, forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               otp:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password Successfully Updated.
 *       400:
 *         description: Validation error or invalid/expired OTP.
 *       404:
 *         description: Invalid code.
 *       500:
 *         description: Server error.
 */
router.post('/reset-password', resetPasswordValidator, resetPassword);


/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user with email or phone and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phonenumber:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful.
 *       400:
 *         description: Invalid credentials or missing fields.
 *       500:
 *         description: Server error.
 */
router.post('/login', loginValidator, loginUser);

/**
 * @swagger
 * /api/auth/send-phone-otp:
 *   post:
 *     summary: Send OTP to phone number for verification
 *     description: Send a 6-digit OTP to the provided phone number for verification purposes. The phone number should include the country code.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number with country code (e.g., +1234567890)
 *                 example: "+1234567890"
 *           examples:
 *             usNumber:
 *               summary: US phone number
 *               value:
 *                 phoneNumber: "+1234567890"
 *             ukNumber:
 *               summary: UK phone number
 *               value:
 *                 phoneNumber: "+447911123456"
 *             indianNumber:
 *               summary: Indian phone number
 *               value:
 *                 phoneNumber: "+919876543210"
 *     responses:
 *       200:
 *         description: OTP sent successfully
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
 *                   example: "OTP sent successfully to your phone number"
 *                 data:
 *                   type: object
 *                   properties:
 *                     phoneNumber:
 *                       type: string
 *                       description: Formatted phone number
 *                       example: "+1234567890"
 *                     messageId:
 *                       type: string
 *                       description: Twilio message ID
 *                       example: "SM1234567890abcdef"
 *             example:
 *               success: true
 *               message: "OTP sent successfully to your phone number"
 *               data:
 *                 phoneNumber: "+1234567890"
 *                 messageId: "SM1234567890abcdef"
 *       400:
 *         description: Bad request - validation error
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
 *                     - "Phone number is required"
 *                     - "Invalid phone number format. Please include country code (e.g., +1234567890)"
 *             examples:
 *               missingPhone:
 *                 summary: Missing phone number
 *                 value:
 *                   success: false
 *                   message: "Phone number is required"
 *               invalidFormat:
 *                 summary: Invalid phone format
 *                 value:
 *                   success: false
 *                   message: "Invalid phone number format. Please include country code (e.g., +1234567890)"
 *       500:
 *         description: Server error or SMS sending failed
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
 *                   example: "Failed to send OTP. Please try again."
 *                 error:
 *                   type: string
 *                   description: Detailed error message from Twilio
 *                   example: "Invalid phone number"
 */
router.post('/send-phone-otp', sendPhoneOTP);

/**
 * @swagger
 * /api/auth/verify-phone-otp:
 *   post:
 *     summary: Verify phone number using OTP
 *     description: Verify the phone number by providing the OTP code that was sent via SMS. This endpoint can be used with or without authentication.
 *     tags: [Auth]
 *     security:
 *       - quantumAccessToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *               - otp
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number with country code (same format used when sending OTP)
 *                 example: "+1234567890"
 *               otp:
 *                 type: string
 *                 description: 6-digit OTP code received via SMS
 *                 example: "123456"
 *                 minLength: 6
 *                 maxLength: 6
 *           examples:
 *             verifyOTP:
 *               summary: Verify OTP
 *               value:
 *                 phoneNumber: "+1234567890"
 *                 otp: "123456"
 *     responses:
 *       200:
 *         description: Phone number verified successfully
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
 *                   example: "Phone number verified successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     phoneNumber:
 *                       type: string
 *                       description: Verified phone number
 *                       example: "+1234567890"
 *                     verified:
 *                       type: boolean
 *                       description: Verification status
 *                       example: true
 *             example:
 *               success: true
 *               message: "Phone number verified successfully"
 *               data:
 *                 phoneNumber: "+1234567890"
 *                 verified: true
 *       400:
 *         description: Bad request - validation error or invalid OTP
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
 *                     - "Phone number and OTP are required"
 *                     - "Invalid OTP or OTP has expired"
 *                     - "OTP has expired. Please request a new one."
 *             examples:
 *               missingFields:
 *                 summary: Missing required fields
 *                 value:
 *                   success: false
 *                   message: "Phone number and OTP are required"
 *               invalidOTP:
 *                 summary: Invalid or expired OTP
 *                 value:
 *                   success: false
 *                   message: "Invalid OTP or OTP has expired"
 *               expiredOTP:
 *                 summary: Expired OTP
 *                 value:
 *                   success: false
 *                   message: "OTP has expired. Please request a new one."
 *       401:
 *         description: Unauthorized - invalid or missing token (if used with authentication)
 *       500:
 *         description: Server error
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
 *                   example: "Failed to verify phone OTP"
 */
router.post('/verify-phone-otp', verifyPhoneOTP);

module.exports = router;