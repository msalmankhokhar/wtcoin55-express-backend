const { Users } = require('../models/users');
const { OTP } = require('../models/otp');
const { Reset_OTP } = require('../models/reset-otp');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createOrUpdateOTP, generateReferralCdoe } = require('../utils/helpers');
const { validationResult } = require('express-validator');
const { mail } = require('../middleware/mails');


const Signup = async (req, res) => {
    // Run the validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, phonenumber, password, verificationCode, referBy="" } = req.body;
    let lowerCaseEmailOrPhone, verificationStatus, existingUser;

    try {
        // Check if it's phonenumber or email signup
        if (!email && !phonenumber) {
            return res.status(400).json({ message: 'Email or phone number is required' });
        } else if (email) {
            // Check if the user already exists
            lowerCaseEmailOrPhone = email.toLowerCase().trim()

            existingUser = await Users.findOne({ email: lowerCaseEmailOrPhone });
            if (existingUser) return res.status(400).json({ message: 'User already exists' });

            // Get the verification status
            verificationStatus = OTP.find( {email: lowerCaseEmailOrPhone, otp: verificationCode} )[0];
        } else if (phonenumber) {
            // Check if the user already exists
            lowerCaseEmailOrPhone = phonenumber.toLowerCase().trim()

            existingUser = await Users.findOne({ phonenumber: lowerCaseEmailOrPhone });
            if (existingUser) return res.status(400).json({ message: 'User already exists' });

            // Get the verification status
            verificationStatus = OTP.find( {phonenumber: lowerCaseEmailOrPhone, otp: verificationCode} )[0];
        }


        if (!verificationStatus || verificationStatus.status !== 'pending') {
            return res.status(400).json({ message: 'Invalid verification code' });
        } else if (verificationStatus.expiredAt < Date.now()) {
            return res.status(400).json({ message: 'Verification code has expired' });
        } else if (verificationStatus && verificationStatus.status === 'pending') {
            verificationStatus.status = 'approved';
            await verificationStatus.save();
        }

        // Hash password
        let salt = await bcrypt.genSalt(10);
        let hashedPassword = await bcrypt.hash(password, salt);

        const refCode = await generateReferralCdoe();

        // Create user
        await Users.create({
            password: hashedPassword,
            email: email ? lowerCaseEmailOrPhone : null,
            phonenumber: phonenumber ? lowerCaseEmailOrPhone : null,
            emailVerified: true,
            referBy: referBy,
            refCode: refCode
        });

        // Send Email Validation Otp
        const newOtp = await createOrUpdateOTP(lowerCaseEmail);

        await mail.sendOTPEmail({ name, email: lowerCaseEmail, otp: newOtp });

        return res.status(200).json({
            success: true,
            message: 'OTP sent to your email. Please verify to complete registration.',
            email: lowerCaseEmail
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
        if (email) {
            const otp = await createOrUpdateOTP(email);
            await mail.sendOTPEmail({ email, otp });
        } else if (phonenumber) {
            const otp = await createOrUpdateOTP(phonenumber);
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
        const user = await Users.findOne({ email: lowerCaseEmail });

        // Check if user exists
        if (!user) return res.status(404).json({ success: false, message: 'Email Does not exist' });

        // Create OTP
        let newOtp = await createOrUpdateResetOTP(lowerCaseEmail);

        await mail.sendResetPassOTP({ name: user.name, email: lowerCaseEmail, otp: newOtp });

        // send push notification to the user for reset password email
        // if (user?.expoPushToken) {
        //     sendPushNotification(user.expoPushToken, 'Reset Password', 'You have requested to reset your password. Please use the OTP to reset your password.');
        // }

        return res.status(200).json({
            success: true,
            message: 'OTP sent to your email. Purpose is to reset password.',
            email: email
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

        let salt = await bcrypt.genSalt(10);
        let hashedPassword = await bcrypt.hash(newPassword, salt);

        await Users.updateOne({ email: email }, { password: hashedPassword });

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

    let { email, password } = req.body;

    try {
        // Normalize email
        const lowerCaseEmail = email.toLowerCase().trim();

        // Find user
        const user = await Users.findOne({ email: lowerCaseEmail });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
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
        
                // Send warning email
                mail.loginWarning({ 
                    name: user.name,
                    email: user.email,
                    ipAddress,
                    loginTime: new Date(),
                    location
                });
            } catch (err) {
                console.error('Failed to get geolocation:', err.message);
        
                // Fallback email with "Unknown location"
                mail.loginWarning({ 
                    name: user.name,
                    email: user.email,
                    ipAddress,
                    loginTime: new Date(),
                    location: 'Unknown'
                });
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
                email: user.email,
                name: user.name,
                // Don't send password or sensitive info
            },
            token
        });

    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
};
