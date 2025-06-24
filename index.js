require('dotenv').config();

let express = require('express');
let session = require('express-session');
let mongoose = require('mongoose');
let swaggerUi = require('swagger-ui-express');
let cookieParser = require('cookie-parser');
let swaggerSpec = require('./utils/swaggerConfig');
let cors = require("cors");
let http = require("http");
let helmet = require('helmet');
const cloudinary = require('cloudinary').v2;
const fileUpload = require('express-fileupload');
const path = require('path');
const os = require('os');
// let xss = require('xss-clean');

let morgan = require('morgan');


const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
console.log('Server running on port:', PORT);

// Middleware to parse JSON
console.log(process.env.SECRET_KEY);
app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false
}));
app.use(helmet());
// app.use(xss());
app.use(morgan('dev'));

// File upload middleware
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: path.join(os.tmpdir(), 'quantum-exchange-uploads'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    abortOnLimit: true
}));

// Hnadle cors
const corsOptions = {
    origin: [
        process.env.WEB_BASE_URL,
        process.env.SERVER_URL,
        `http://localhost:${PORT}`,
        `http://localhost:3000`,
        `https://quantum-exchange.onrender.com`,
        `https://quantum-exchange.vercel.app`,
        'https://qtex.app',
        'https://www.qtex.app',
        'https://qtrade.exchange',
        'https://www.qtrade.exchange'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
};

app.use(cors(corsOptions));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


// Sample route
const authRoutes = require('./routes/auth');
const ccpaymentRoutes = require('./routes/ccpayment');
const bitmartRoutes = require('./routes/bitmart');
// const kucoinRoutes = require('./routes/kucoin');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const tradesRoutes = require('./routes/trades');
const withdrawalRoutes = require('./routes/withdrawal');
const transferRoutes = require('./routes/transfer');

app.get("/", (req, res) => {
  res.send("Hello, Express.js!");
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/auth', authRoutes);
app.use('/api/ccpayment', ccpaymentRoutes);
app.use('/api/bitmart', bitmartRoutes);
// app.use('/api/kucoin', kucoinRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/trades', tradesRoutes);
app.use('/api/withdrawal', withdrawalRoutes);
app.use('/api/transfer', transferRoutes);


mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, serverSelectionTimeoutMS: 10000 })
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('MongoDB connection error:', err));


// Import and initialize cron jobs
require('./cronjob/index');


// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
