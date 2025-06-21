const { Users } = require('../models/users');
const { Reset_OTP } = require('../models/reset-otp');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createOrUpdateOTP, createOrUpdateResetOTP, generateReferralCdoe, validateVerificationCode } = require('../utils/helpers');
const { validationResult } = require('express-validator');
const { Mail } = require('../middleware/mails');
const requestIp = require('request-ip');
const axios = require('axios');
require('dotenv').config();

const mail = new Mail();

// List of accounts that already have hashed passwords
const devs = ["emmanuelcyril06@gmail.com", "onarigeorge013@gmail.com", "onarigeorge747@gmail.com"];

const Signup = async (req, res) => {
    // Run the validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, phonenumber, password, verificationCode, referBy="" } = req.body;
    let lowerCaseEmailOrPhone;

    try {
        // Check if it's phonenumber or email signup
        if (!email && !phonenumber) {
            return res.status(400).json({ message: 'Email or phone number is required' });
        } 
        lowerCaseEmailOrPhone = email ? email.toLowerCase().trim() : phonenumber.toLowerCase().trim();
        // console.log('LowerCase Email or Phone: ', lowerCaseEmailOrPhone);

        // Check if user already exists
        await Users.findOne({ $or: [{email: lowerCaseEmailOrPhone}, {phonenumber: lowerCaseEmailOrPhone}] })
            .then(user => {
                if (user) {
                    return res.status(400).json({ message: 'User already exists with this email or phone number' });
                }
            })
            .catch(err => {
                console.error('Error checking user existence:', err);
                return res.status(500).json({ message: 'Internal Server Error' });
            });

        const [verificationStatus, verificationResponse] = await validateVerificationCode(
            emailOrPhonenumber=lowerCaseEmailOrPhone,
            code=verificationCode
        );
        // console.log('Verification Status:', verificationStatus);
        // console.log('Verification Response:', verificationResponse);

        if (!verificationStatus) {
            return res.status(400).json({ message: verificationResponse });
        }

        // Save password as plain text (no hashing)
        const refCode = await generateReferralCdoe();

        // Create user
        console.log(email, phonenumber, password, referBy, refCode);
        const newUser = await Users.create({
            password: password, // Save as plain text
            email: email ? email.toLowerCase().trim() : undefined,
            phonenumber: phonenumber ? phonenumber.trim() : undefined,
            emailVerified: true,
            referBy,
            refCode
        });

        console.log('New User Created:', newUser);
        const web_base_url = process.env.WEB_BASE_URL;

        await mail.sendWelcomeMessage({ email: lowerCaseEmailOrPhone, web_base_url });

        return res.status(200).json({
            success: true,
            message: 'OTP sent to your email. Please verify to complete registration.',
            email: newUser.email || null,
            phonenumber: newUser.phonenumber || null 
        });

    } catch (error) {
        console.log("Error: ", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

const GetVerificationCode = async (req, res) => {
    const { email, phonenumber } = req.body;
    if (!email && !phonenumber) return res.status(400).json({ message: 'Email or Phonenumber is required' });

    try {
        let otp;
        if (email) {
            otp = await createOrUpdateOTP(email);
            await mail.sendOTPEmail({ email, otp });
        } else if (phonenumber) {
            otp = await createOrUpdateOTP(phonenumber);
            await mail.sendOTPEmail({ phonenumber, otp });
        }
        res.status(200).json({ otp });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

const forgotPassword = async (req, res) => {
    // Run the validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email } = req.body;

        let lowerCaseEmail = email.toLowerCase().trim()
        const user = await Users.findOne({ $or: [{email: lowerCaseEmail}, {phonenumber: lowerCaseEmail}] });


        // Check if user exists
        if (!user) return res.status(404).json({ success: false, message: 'Email Does not exist' });

        // Create OTP
        let newOtp = await createOrUpdateResetOTP(lowerCaseEmail);

        await mail.sendResetPassOTP({ email: lowerCaseEmail, otp: newOtp });

        // send push notification to the user for reset password email
        // if (user?.expoPushToken) {
        //     sendPushNotification(user.expoPushToken, 'Reset Password', 'You have requested to reset your password. Please use the OTP to reset your password.');
        // }

        console.log("Otp: ", newOtp);

        return res.status(200).json({
            success: true,
            message: 'OTP sent to your email. Purpose is to reset password.',
            email: user.email,
            phonenumber: user.phonenumber || null
        });
    } catch (error) {
        console.log("*********00 error", error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

const resetPassword = async (req, res) => {
    // Run the validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { otp, email, newPassword } = req.body;

        let reset_otp = (await Reset_OTP.find({ email: email, otp: otp }));

        if (!reset_otp.length) return res.status(404).json({ status: false, message: 'Invalid code' });

        const current_reset_otp = reset_otp[0];

        if (!current_reset_otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }
        else if (current_reset_otp.expiredAt && current_reset_otp.expiredAt.getTime() < Date.now()) {
            await Reset_OTP.deleteOne({ _id: current_reset_otp._id });
            return res.status(400).json({ message: 'Invalid OTP (expired)' });
        }

        // Check if user is in the exception list
        const isExceptionUser = devs.includes(email.toLowerCase().trim());
        
        let passwordToSave;
        if (isExceptionUser) {
            // For exception users, hash the password
            let salt = await bcrypt.genSalt(10);
            passwordToSave = await bcrypt.hash(newPassword, salt);
        } else {
            // For new users, save as plain text
            passwordToSave = newPassword;
        }

        await Users.updateOne({ email: email }, { password: passwordToSave });

        await Reset_OTP.deleteMany({ email: email });

        return res.status(200).json({
            success: true,
            message: 'Password Successfully Updated',
            email: email
        });

    } catch (error) {
        console.log("*********00 error", error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};


const loginUser = async (req, res) => {
    // Run the validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    let { email, phonenumber, password } = req.body;

    try {
        // Normalize email
        const lowerCaseEmail = email ? email.toLowerCase().trim() : phonenumber.toLowerCase().trim();
        if (!lowerCaseEmail || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find user
        const user = await Users.findOne({ $or: [{email: lowerCaseEmail}, {phonenumber: lowerCaseEmail}] });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check if user is in the exception list (has hashed password)
        const isExceptionUser = devs.includes(lowerCaseEmail);
        
        let isMatch = false;
        
        if (isExceptionUser) {
            // For exception users, compare with hashed password
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            // For new users, compare plain text passwords
            isMatch = (password === user.password);
        }

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check if the ip address is valid if not email user
        const ipAddress = requestIp.getClientIp(req);
        if (user.ipAddress !== ipAddress) {
            try {
                // Get location info from IP
                const response = await axios.get(`http://ip-api.com/json/${ipAddress}`);
                const geo = response.data;
        
                const location = `${geo.city}, ${geo.regionName}, ${geo.country}`;
                
                console.log('IP Address:', ipAddress);
                console.log('Geolocation:', location);
        
                // Send warning email
                // mail.loginWarning({ 
                //     email: user.email,
                //     ipAddress,
                //     loginTime: new Date(),
                //     location
                // });
            } catch (err) {
                console.error('Failed to get geolocation:', err.message);
        
                // Fallback email with "Unknown location"
                // mail.loginWarning({ 
                //     email: user.email,
                //     ipAddress,
                //     loginTime: new Date(),
                //     location: 'Unknown'
                // });
            }
        }

        // Create the token
        const token = await jwt.sign({_id: user._id}, process.env.SECRET_KEY, {
            algorithm: "HS256",
        });

        // Respond with success
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                email: user.email || null,
                phonenumber: user.phonenumber || null
            },
            token
        });

    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
};



module.exports = { loginUser, Signup, GetVerificationCode, forgotPassword, resetPassword };

