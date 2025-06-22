const twilio = require('twilio');

/**
 * Twilio SMS Service Class
 * Handles SMS sending functionality for phone number verification
 */
class TwilioService {
    constructor() {
        // Initialize Twilio client with environment variables
        this.client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        
        this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
        
        // Validate required environment variables
        if (!process.env.TWILIO_ACCOUNT_SID) {
            console.error('❌ TWILIO_ACCOUNT_SID environment variable is required');
        }
        if (!process.env.TWILIO_AUTH_TOKEN) {
            console.error('❌ TWILIO_AUTH_TOKEN environment variable is required');
        }
        if (!process.env.TWILIO_PHONE_NUMBER) {
            console.error('❌ TWILIO_PHONE_NUMBER environment variable is required');
        }
    }

    /**
     * Send SMS message
     * @param {string} to - Recipient phone number (with country code)
     * @param {string} message - Message content
     * @returns {Promise<Object>} - Twilio message object
     */
    async sendSMS(to, message) {
        try {
            // Validate phone number format
            if (!this.isValidPhoneNumber(to)) {
                throw new Error('Invalid phone number format. Please include country code (e.g., +1234567890)');
            }

            // Validate message content
            if (!message || message.trim().length === 0) {
                throw new Error('Message content cannot be empty');
            }

            // Check if Twilio is properly configured
            if (!this.client || !this.fromNumber) {
                throw new Error('Twilio service not properly configured. Check environment variables.');
            }

            console.log(`📱 Sending SMS to: ${to}`);
            console.log(`📝 Message: ${message}`);

            const result = await this.client.messages.create({
                body: message,
                from: this.fromNumber,
                to: to
            });

            console.log(`✅ SMS sent successfully! SID: ${result.sid}`);

            return {
                success: true,
                messageId: result.sid,
                status: result.status,
                to: result.to,
                from: result.from,
                body: result.body,
                sentAt: result.dateCreated
            };

        } catch (error) {
            console.error('❌ Error sending SMS:', error.message);

            return {
                success: false,
                error: error.message,
                code: error.code || 'UNKNOWN_ERROR'
            };
        }
    }

    /**
     * Send OTP verification SMS
     * @param {string} phoneNumber - Recipient phone number
     * @param {string} otp - OTP code
     * @param {string} appName - Application name (optional)
     * @returns {Promise<Object>} - SMS result
     */
    async sendOTP(phoneNumber, otp, appName = 'Quantum Exchange') {
        const message = `Your ${appName} verification code is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;
        
        return await this.sendSMS(phoneNumber, message);
    }

    /**
     * Send welcome SMS
     * @param {string} phoneNumber - Recipient phone number
     * @param {string} userName - User's name
     * @param {string} appName - Application name (optional)
     * @returns {Promise<Object>} - SMS result
     */
    async sendWelcomeSMS(phoneNumber, userName, appName = 'Quantum Exchange') {
        const message = `Welcome to ${appName}, ${userName}! Your account has been successfully created. Thank you for joining us!`;
        
        return await this.sendSMS(phoneNumber, message);
    }

    /**
     * Send password reset SMS
     * @param {string} phoneNumber - Recipient phone number
     * @param {string} resetCode - Password reset code
     * @param {string} appName - Application name (optional)
     * @returns {Promise<Object>} - SMS result
     */
    async sendPasswordResetSMS(phoneNumber, resetCode, appName = 'Quantum Exchange') {
        const message = `Your ${appName} password reset code is: ${resetCode}. Valid for 15 minutes. If you didn't request this, please ignore this message.`;
        
        return await this.sendSMS(phoneNumber, message);
    }

    /**
     * Send withdrawal notification SMS
     * @param {string} phoneNumber - Recipient phone number
     * @param {string} amount - Withdrawal amount
     * @param {string} currency - Currency
     * @param {string} status - Withdrawal status
     * @returns {Promise<Object>} - SMS result
     */
    async sendWithdrawalNotification(phoneNumber, amount, currency, status) {
        const message = `Your withdrawal of ${amount} ${currency} has been ${status}. Check your account for details.`;
        
        return await this.sendSMS(phoneNumber, message);
    }

    /**
     * Send security alert SMS
     * @param {string} phoneNumber - Recipient phone number
     * @param {string} alertType - Type of security alert
     * @param {string} details - Alert details
     * @returns {Promise<Object>} - SMS result
     */
    async sendSecurityAlert(phoneNumber, alertType, details) {
        const message = `Security Alert: ${alertType}. ${details}. If this wasn't you, please contact support immediately.`;
        
        return await this.sendSMS(phoneNumber, message);
    }

    /**
     * Validate phone number format
     * @param {string} phoneNumber - Phone number to validate
     * @returns {boolean} - True if valid, false otherwise
     */
    isValidPhoneNumber(phoneNumber) {
        // Basic validation for international phone numbers
        // Should start with + and contain 7-15 digits
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        return phoneRegex.test(phoneNumber);
    }

    /**
     * Format phone number to international format
     * @param {string} phoneNumber - Phone number to format
     * @param {string} countryCode - Country code (default: +1 for US)
     * @returns {string} - Formatted phone number
     */
    formatPhoneNumber(phoneNumber, countryCode = '+1') {
        // Remove all non-digit characters
        const digits = phoneNumber.replace(/\D/g, '');
        
        // If it already starts with +, return as is
        if (phoneNumber.startsWith('+')) {
            return phoneNumber;
        }
        
        // If it starts with 1 and has 10 digits, assume US number
        if (digits.length === 10) {
            return `+1${digits}`;
        }
        
        // If it starts with 1 and has 11 digits, assume US number
        if (digits.length === 11 && digits.startsWith('1')) {
            return `+${digits}`;
        }
        
        // Otherwise, prepend the country code
        return `${countryCode}${digits}`;
    }

    /**
     * Get message status
     * @param {string} messageId - Twilio message SID
     * @returns {Promise<Object>} - Message status
     */
    async getMessageStatus(messageId) {
        try {
            const message = await this.client.messages(messageId).fetch();
            
            return {
                success: true,
                messageId: message.sid,
                status: message.status,
                to: message.to,
                from: message.from,
                body: message.body,
                sentAt: message.dateCreated,
                deliveredAt: message.dateSent
            };
        } catch (error) {
            console.error('❌ Error getting message status:', error.message);

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Check Twilio service health
     * @returns {Promise<Object>} - Service health status
     */
    async checkHealth() {
        try {
            // Try to fetch account details to verify credentials
            const account = await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
            
            return {
                success: true,
                status: 'healthy',
                accountSid: account.sid,
                accountName: account.friendlyName,
                accountStatus: account.status,
                balance: account.balance,
                currency: account.currency
            };
        } catch (error) {
            console.error('❌ Twilio health check failed:', error.message);

            return {
                success: false,
                status: 'unhealthy',
                error: error.message
            };
        }
    }
}

// Create and export a singleton instance
const twilioService = new TwilioService();

module.exports = twilioService; 