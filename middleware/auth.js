// importing the required modules
const { Users } = require("../models/users.js");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
// import speakeasy from 'speakeasy';
// import { sendPushNotification } from "../utils/ExpoNotify.js";

// Load environment variables
dotenv.config();

exports.tokenRequired = async (req, res, next) => {
     if (!req.headers.quantumaccesstoken) {
          // console.log(req.headers);
          return res.status(401).json({
               status: false,
               message: "You've got some errors.",
               error: "TOKEN_ERROR"
          });
     }

     try {
          const token = req.headers.quantumaccesstoken;
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