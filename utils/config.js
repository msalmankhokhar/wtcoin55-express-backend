// utils/config.js
require("dotenv").config();

let _configs = {

    MONGO_URI: process.env.MONGO_URI,
    PORT: process.env.PORT,
    SERVER_URL: process.env.SERVER_URL,
    // WEB_BASE_URL: process.env.WEB_BASE_URL,
    // APP_NAME: process.env.APP_NAME,
    // APP_DESC: process.env.APP_DESC,
    // GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    // GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    // GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
    SECRET_KEY: process.env.SECRET_KEY,
    // EMAIL_USERNAME: process.env.EMAIL_USERNAME,
    // EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
    // EMAIL_HOST: process.env.EMAIL_HOST,
    // ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    // TATUM_API_KEY: process.env.TATUM_API_KEY,
    // ENCRYPTION_SECRET_KEY: process.env.ENCRYPTION_SECRET_KEY,
    // ENCRYPTION_ALGORITHM: process.env.ENCRYPTION_ALGORITHM,
}

module.exports = { _configs }