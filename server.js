// serverless-server.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();
const session = require('express-session');
const passport = require('./config/passport-config');
const { connectDB } = require('./config/db');
const routes = require('./routes');
const serverless = require('serverless-http');

const app = express();

// Middleware
app.use('/api/payment/webhook/stripe', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));
app.use('/uploads', express.static('uploads'));

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api', routes);

app.get('/', (req, res) => {
    res.send(`ShopiClone Backend API is running!, node version: ${process.version}`);
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
});

// Connect to MongoDB (once at cold start)
connectDB().then(() => console.log('MongoDB Connected'));

// Export handler for Vercel
module.exports.handler = serverless(app);