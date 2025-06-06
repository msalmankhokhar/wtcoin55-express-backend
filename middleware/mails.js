let nodemailer = require("nodemailer");
let { readFile } = require("fs");
let handlebars = require("handlebars");
let path = require("path");
require("dotenv").config();

class Mail {
    constructor() {
        this.username = process.env.EMAIL_USERNAME;
        this.password = process.env.EMAIL_PASSWORD;
        this.host = process.env.EMAIL_HOST;
        this.admin = process.env.ADMIN_EMAIL;
        this.appName = process.env.APP_NAME

        this.welcomeMail = path.join(__dirname, "../mails/welcome.html");
        this.loginWarning = path.join(__dirname, "../mails/login_warning.html");
        // this.contactMail = path.join(__dirname, "../mails/contact.html");
        // this.depositMail = path.join(__dirname, "../mails/deposit-confirmation.html");
        // this.kycApprovedMail = path.join(__dirname, "../mails/kyc-approved.html");
        // this.kycRejectedMail = path.join(__dirname, "../mails/kyc-rejected.html");
        // this.merchantApprovedMail = path.join(__dirname, "../mails/merchant-approved.html");
        // this.newsletterMail = path.join(__dirname, "../mails/newsletter.html");
        this.otpMail = path.join(__dirname, "../mails/otp.html");
        // this.passwordResetMail = path.join(__dirname, "../mails/password-reset.html");
        // this.paymentMethodAddedMail = path.join(__dirname, "../mails/payment-method-added.html");
        // this.phoneApprovedMail = path.join(__dirname, "../mails/phone-approved.html");
        // this.resetPassMail = path.join(__dirname, "../mails/ResetPass.html");
        // this.signinNotificationMail = path.join(__dirname, "../mails/signin-notification.html");
        // this.withdrawalCompletedMail = path.join(__dirname, "../mails/withdrawal-completed.html");
        // this.changePassowrdOTPMail = path.join(__dirname, "../mails/passwordChange.html");
        // this.withdrawalAttemptOTPMail = path.join(__dirname, "../mails/withdrawal-otp.html");
        // this.withdrawalRequestMail = path.join(__dirname, "../mails/withdrawal-request.html")



        this.transporter = nodemailer.createTransport({
            host: this.host,
            port: 465,
            secure: true,
            auth: {
                user: this.username,
                pass: this.password,
            },
        });
    }

    async sendWelcomeMessage({ email, name="User", web_base_url }) {
        let data = {
            name, web_base_url
        }
        let msg = {
            to: email,
            from: {
                name: this.appName,
                address: this.admin,
            },
            subject: 'Welcome to Elentis',
            html: await this.renderTemplate(this.welcomeMail, data),
        };

        return new Promise((resolve, reject) => {
            this.transporter
                .sendMail(msg)
                .then((status) => {
                    resolve(status);
                })
                .catch((error) => {
                    reject(error);
                    return;
                });
        });
    }

    async sendOTPEmail({email, otp }) {
        let data = {
            otp: otp
        };

        let msg = {
            to: email,
            from: {
                name: process.env.APP_NAME,
                address: this.admin,
            },
            subject: 'Verify Your Email',
            html: await this.renderTemplate(this.otpMail, data),
        };

        return new Promise((resolve, reject) => {
            this.transporter
                .sendMail(msg)
                .then((status) => {
                    resolve(status);
                })
                .catch((error) => {
                    reject(error);
                    return;
                });
        });
    }

    // async sendWithdrawalOTPEmail({ email, otp, createdAt }) {
    //     let data = {
    //         otp: otp,
    //         createdAt
    //     };

    //     let msg = {
    //         to: email,
    //         from: {
    //             name: process.env.APP_NAME,
    //             address: this.admin,
    //         },
    //         subject: 'Withdrawal Attempt',
    //         html: await this.renderTemplate(this.withdrawalAttemptOTPMail, data),
    //     };

    //     return new Promise((resolve, reject) => {
    //         this.transporter
    //             .sendMail(msg)
    //             .then((status) => {
    //                 resolve(status);
    //             })
    //             .catch((error) => {
    //                 reject(error);
    //                 return;
    //             });
    //     });
    // }

    // async sendChangePassowrdOTPEmail({ email, otp, createdAt }) {
    //     let data = {
    //         otp: otp,
    //         createdAt
    //     };

    //     let msg = {
    //         to: email,
    //         from: {
    //             name: process.env.APP_NAME,
    //             address: this.admin,
    //         },
    //         subject: 'Password Change Attempt',
    //         html: await this.renderTemplate(this.changePassowrdOTPMail, data),
    //     };

    //     return new Promise((resolve, reject) => {
    //         this.transporter
    //             .sendMail(msg)
    //             .then((status) => {
    //                 resolve(status);
    //             })
    //             .catch((error) => {
    //                 reject(error);
    //                 return;
    //             });
    //     });
    // }

    // async sendMerchantApprovalEmail({ email, name, merchantId, approvalDate, accountLevel, tradingLimit }) {
    //     let data = {
    //         name: name,
    //         merchantId: merchantId,
    //         approvalDate: approvalDate,
    //         accountLevel: accountLevel,
    //         tradingLimit: tradingLimit
    //     };

    //     let msg = {
    //         to: email,
    //         from: {
    //             name: process.env.APP_NAME,
    //             address: this.admin,
    //         },
    //         subject: 'Merchant Request Status',
    //         html: await this.renderTemplate(this.merchantApprovedMail, data),
    //     };

    //     return new Promise((resolve, reject) => {
    //         this.transporter
    //             .sendMail(msg)
    //             .then((status) => {
    //                 resolve(status);
    //             })
    //             .catch((error) => {
    //                 reject(error);
    //                 return;
    //             });
    //     });
    // }

    async sendResetPassOTP({ email, otp }) {
        let data = {
            otp: otp
        };

        let msg = {
            to: email,
            from: {
                name: process.env.APP_NAME,
                address: this.admin,
            },
            subject: 'Password Reset',
            html: await this.renderTemplateString(`
                <p>Dear User,</p>
                <p>Your OTP for your password reset is: <strong>{{otp}}</strong></p>
                <p>This OTP will expire in 5 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <p>Best regards,</p>
                <p>${process.env.APP_NAME} Team</p>
            `, data),
        };

        return new Promise((resolve, reject) => {
            this.transporter
                .sendMail(msg)
                .then((status) => {
                    resolve(status);
                })
                .catch((error) => {
                    reject(error);
                    return;
                });
        });
    }

    /**
     * Send login warning email
     * @param {string} email 
     * @param {string} ipAddress 
     * @param {string} loginTime
     * @param {string} location
     * @returns {Promise<string>}
     */
    async loginWarning({ email, ipAddress, loginTime, location }) {
        let data = {
            email: email,
            ipAddress: ipAddress,
            loginTime: loginTime,
            location: location
        };

        let msg = {
            to: email,
            from: {
                name: process.env.APP_NAME,
                address: this.admin,
            },
            subject: 'Login Warning',
            html: await this.renderTemplate(this.loginWarning, data),
        };

        return new Promise((resolve, reject) => {
            this.transporter
                .sendMail(msg)
                .then((status) => {
                    resolve(status);
                })
                .catch((error) => {
                    reject(error);
                    return;
                });
        });
    }

    // async sendVendorAdsBlockedEmail({ name, email, adId }) {
    //     let data = {
    //         name: name,
    //         adId: adId
    //     };

    //     let msg = {
    //         to: email,
    //         from: {
    //             name: process.env.APP_NAME,
    //             address: this.admin,
    //         },
    //         subject: 'Your Ad has been Blocked',
    //         html: await this.renderTemplateString(`
    //             <p>Dear {{name}},</p>
    //             <p>Your ad with ID <strong>{{adId}}</strong> has been blocked by the admin.</p>
    //             <p>Best regards,</p>
    //             <p>${process.env.APP_NAME} Team</p>
    //         `, data),
    //     };

    //     return new Promise((resolve, reject) => {
    //         this.transporter
    //             .sendMail(msg)
    //             .then((status) => {
    //                 resolve(status);
    //             })
    //             .catch((error) => {
    //                 reject(error);
    //                 return;
    //             });
    //     });
    // }

    // async sendVendorAdsUnblockedEmail({ name, email, adId }) {
    //     let data = {
    //         name: name,
    //         adId: adId
    //     };

    //     let msg = {
    //         to: email,
    //         from: {
    //             name: process.env.APP_NAME,
    //             address: this.admin,
    //         },
    //         subject: 'Your Ad has been Unblocked',
    //         html: await this.renderTemplateString(`
    //             <p>Dear {{name}},</p>
    //             <p>Your ad with ID <strong>{{adId}}</strong> has been unblocked by the admin.</p>
    //             <p>Best regards,</p>
    //             <p>${process.env.APP_NAME} Team</p>
    //         `, data),
    //     };

    //     return new Promise((resolve, reject) => {
    //         this.transporter
    //             .sendMail(msg)
    //             .then((status) => {
    //                 resolve(status);
    //             })
    //             .catch((error) => {
    //                 reject(error);
    //                 return;
    //             });
    //     });
    // }

    // async sendNinVerifiedEmail({ name, email }) {
    //     let data = {
    //         name: name,
    //     };

    //     let msg = {
    //         to: email,
    //         from: {
    //             name: process.env.APP_NAME,
    //             address: this.admin,
    //         },
    //         subject: 'Your NIN has been Verified',
    //         html: await this.renderTemplateString(`
    //             <p>Dear {{name}},</p>
    //             <p>Your NIN has been verified successfully.</p>
    //             <p>Best regards,</p>
    //             <p>${process.env.APP_NAME} Team</p>
    //         `, data),
    //     };

    //     return new Promise((resolve, reject) => {
    //         this.transporter
    //             .sendMail(msg)
    //             .then((status) => {
    //                 resolve(status);
    //             })
    //             .catch((error) => {
    //                 reject(error);
    //                 return;
    //             });
    //     });

    // }

    // async welcomeEmail(user) {
    //     //   compiling the email template data
    //     let data = {
    //         name: user.name
    //     };

    //     let msg = {
    //         to: user.email,
    //         from: {
    //             name: process.env.APP_NAME,
    //             address: this.admin,
    //         },
    //         subject: utils.mail['welcome'].subject,
    //         html: await this.renderTemplateString(utils.mail['welcome'].body, data),
    //     };

    //     return new Promise((resolve, reject) => {
    //         this.transporter
    //             .sendMail(msg)
    //             .then((status) => {
    //                 resolve(status);
    //             })
    //             .catch((error) => {
    //                 reject(error);
    //                 return;
    //             });
    //     });
    // }

    openFile(path) {
        return new Promise((resolve, reject) => {
            readFile(path, { encoding: "utf-8" }, (error, data) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(data);
            });
        });
    }

    async renderTemplate(path, data) {
        let template = await this.openFile(path);

        let render = handlebars.compile(template);

        return render(data);
    }

    renderTemplateString(template, data) {
        return template.replace(/{{([^}]+)}}/g, (_, key) => data[key]);
    }

    // async sendProofOfAddressVerifiedEmail({ name, email }) {
    //     let data = {
    //         name: name,
    //     };

    //     let msg = {
    //         to: email,
    //         from: {
    //             name: process.env.APP_NAME,
    //             address: this.admin,
    //         },
    //         subject: 'Your Proof of Address has been Verified',
    //         html: await this.renderTemplateString(`
    //             <p>Dear {{name}},</p>
    //             <p>Your proof of address has been verified successfully.</p>
    //             <p>Best regards,</p>
    //             <p>${process.env.APP_NAME} Team</p>
    //         `, data),
    //     };

    //     return new Promise((resolve, reject) => {
    //         this.transporter
    //             .sendMail(msg)
    //             .then((status) => {
    //                 resolve(status);
    //             })
    //             .catch((error) => {
    //                 reject(error);
    //                 return;
    //             });
    //     });
    // }

    // async sendContactUsEmail({ userEmail, message, phoneNumber }) {
    //     let data = {
    //         userEmail: userEmail,
    //         message: message,
    //         phoneNumber: phoneNumber
    //     };

    //     let msg = {
    //         to: this.admin,
    //         from: {
    //             name: process.env.APP_NAME,
    //             address: userEmail,
    //         },
    //         subject: 'New Contact Form Submission',
    //         html: await this.renderTemplateString(`
    //             <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
    //                 <div style="text-align: center; margin-bottom: 30px;">
    //                     <h2 style="color: #333; margin: 0;">${process.env.APP_NAME} Contact Form</h2>
    //                 </div>
    //                 <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
    //                     <h3 style="color: #444; margin-top: 0;">New Message Details</h3>
    //                     <p style="color: #666; margin-bottom: 15px;"><strong>From:</strong> {{userEmail}}</p>
    //                     <div style="background-color: white; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff;">
    //                         <p style="color: #555; margin: 0; line-height: 1.6;">{{message}}</p>
    //                     </div>
    //                 </div>
    //                 <p style="color: #666; margin-bottom: 15px;"><strong>Phone Number:</strong> {{phoneNumber}}</p>
    //                 <div style="text-align: center; color: #888; font-size: 12px;">
    //                     <p>This message was sent via ${process.env.APP_NAME} contact form.</p>
    //                 </div>
    //             </div>
    //         `, data),
    //         replyTo: userEmail
    //     };

    //     return new Promise((resolve, reject) => {
    //         this.transporter
    //             .sendMail(msg)
    //             .then((status) => {
    //                 resolve(status);
    //             })
    //             .catch((error) => {
    //                 reject(error);
    //                 return;
    //             });
    //     });
    // }
}

module.exports = { Mail };
