const { body } = require('express-validator');
require('dotenv').config();

exports.signupValidator = [
    body('email')
        .optional()
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .isLength({ min: 5 }).withMessage('Email must be at least 5 characters long'),

    body('phonenumber')
        .optional()
        .trim()
        .notEmpty().withMessage('Phonenumber is empty')
        .isMobilePhone('any').withMessage('Invalid phone number format'),

    body('password')
        .trim()
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
];

exports.loginValidator = [
    body('email')
        .optional()
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .isLength({ min: 5 }).withMessage('Email must be at least 5 characters long'),
    
    body('phonenumber')
    .optional()
    .trim()
    .notEmpty().withMessage('Phonenumber is empty')
    .isMobilePhone('any').withMessage('Invalid phone number format'),

    body('password')
        .trim()
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
];

exports.EmailValidator = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
];

exports.resetPasswordValidator = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format'),

    body('newPassword')
        .trim()
        .notEmpty().withMessage('Password is required'),
    
    body('otp')
        .trim()
        .notEmpty().withMessage('Otp is required')
];

exports.verifyEmailValidator = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format'),

    body('otp')
        .trim()
        .notEmpty().withMessage('Otp is required')
];

