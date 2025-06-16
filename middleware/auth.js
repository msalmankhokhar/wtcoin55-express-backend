// importing the required modules
const { Users } = require("../models/users.js");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
// import speakeasy from 'speakeasy';
// import { sendPushNotification } from "../utils/ExpoNotify.js";

// Load environment variables
dotenv.config();

exports.tokenRequired = async (req, res, next) => {
     let token = req.headers.quantumaccesstoken;
     
     if (!token && req.headers.authorization) {
          // Extract token from "Bearer <token>" format
          const authHeader = req.headers.authorization;
          if (authHeader.startsWith('Bearer ')) {
               token = authHeader.substring(7); // Remove "Bearer " prefix
          }
     }

     if (!token) {
          console.log(req.headers);
          return res.status(401).json({
               status: false,
               message: "You've got some errors.",
               error: "TOKEN_ERROR"
          });
     }

     try {
          const decodedToken = jwt.verify(token, process.env.SECRET_KEY, {
               algorithms: "HS256"
          });

          const user = await Users.findOne({
               _id: decodedToken._id,
          });
          if (!user) {
               return res.status(401).json({
                    status: false,
                    message: "You've got some errors.",
                    error: "INVALID_TOKEN_ERROR"
               });
          }

          const { password, ...userData } = user._doc;
          req.user = userData;

          next();
     } catch (error) {
          console.error('Token validation failed', { error: error.message });
          return res.status(401).json({
               status: false,
               message: "You've got some errors.",
               error: "INVALID_TOKEN_ERROR"
          });
     }
};