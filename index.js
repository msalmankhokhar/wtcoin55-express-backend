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

// Hnadle cors
const corsOptions = {
    origin: [
        process.env.WEB_BASE_URL,
        process.env.SERVER_URL,
        `http://localhost:${PORT}`,
        `http://localhost:5173`
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
};

app.use(cors(corsOptions));

// Sample route
const authRoutes = require('./routes/auth');
const ccpaymentRoutes = require('./routes/ccpayment');

app.get("/", (req, res) => {
  res.send("Hello, Express.js!");
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/auth', authRoutes);
app.use('/api/ccpayment', ccpaymentRoutes);


mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
