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
const rateLimit = require('express-rate-limit');


const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
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
// Enhanced security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// Additional security middleware
app.use((req, res, next) => {
    // Remove server information
    res.removeHeader('X-Powered-By');
    
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    next();
});
// app.use(xss());
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use(limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// File upload middleware
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: path.join(os.tmpdir(), 'quantum-exchange-uploads'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    abortOnLimit: true
}));

// Handle CORS with strict origin validation
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            return callback(new Error('Not allowed by CORS'), false);
        }
        
        const allowedOrigins = [
            process.env.WEB_BASE_URL,
            process.env.SERVER_URL,
            `https://quantum-exchange.onrender.com`,
            `https://quantum-exchange.vercel.app`,
            'https://qtex.app',
            'https://www.qtex.app',
            'https://qtrade.exchange',
            'https://www.qtrade.exchange'
        ];
        
        // Only allow localhost in development
        if (process.env.NODE_ENV === 'development') {
            allowedOrigins.push(`http://localhost:${PORT}`, `http://localhost:3000`);
        }
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log(`🚫 CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'), false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400 // 24 hours
};

// Custom middleware to block requests from unauthorized tools
app.use((req, res, next) => {
    const origin = req.get('Origin');
    const userAgent = req.get('User-Agent');
    
    // Block requests with suspicious User-Agents
    const blockedUserAgents = [
        'curl',
        'postman',
        'insomnia',
        'thunder client',
        'httpie',
        'wget',
        'python-requests'
    ];
    
    const isBlockedUserAgent = blockedUserAgents.some(agent => 
        userAgent && userAgent.toLowerCase().includes(agent.toLowerCase())
    );
    
    if (isBlockedUserAgent) {
        console.log(`🚫 Blocked request from User-Agent: ${userAgent}`);
        return res.status(403).json({
            error: 'Access denied',
            message: 'This API cannot be accessed from this client'
        });
    }
    
    // Block requests without proper origin in production
    if (process.env.NODE_ENV === 'production' && !origin) {
        console.log(`🚫 Blocked request without origin from IP: ${req.ip}`);
        return res.status(403).json({
            error: 'Access denied',
            message: 'Origin header required'
        });
    }
    
    next();
});

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
app.use('/api/auth', authLimiter, authRoutes);
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
