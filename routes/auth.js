let express = require('express');
const { Signup, loginUser, forgotPassword, resetPassword, GetVerificationCode } = require('../controllers/auth');
const { signupValidator, loginValidator, EmailValidator, resetPasswordValidator } = require('../middleware/validators');
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



module.exports = router;