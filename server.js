
// const express = require('express');
// const cors = require('cors');
// const morgan = require('morgan');
// require('dotenv').config();
// const session = require('express-session');
// const passport = require('./config/passport-config');
// const { connectDB } = require('./config/db');
// const routes = require('./routes');

// const app = express();

// // Middleware
// // Use raw body for Stripe webhooks BEFORE general JSON parsing
// app.use('/api/payment/webhook/stripe', express.raw({ type: 'application/json' }));

// app.use(express.json());
// app.use(cors());
// app.use(morgan('dev'));
// app.use('/uploads', express.static('uploads')); // Serve uploaded files

// // Session Middleware
// app.use(session({
//     secret: process.env.SESSION_SECRET || 'secret',
//     resave: false,
//     saveUninitialized: false
// }));

// // Passport Middleware
// app.use(passport.initialize());
// app.use(passport.session());

// // Routes
// app.use('/api', routes);

// app.get('/', (req, res) => {
//     res.send(`ShopiClone Backend API is running!, node version: ${process.version}`
//     );
// });
// // Global Error Handler
// app.use((err, req, res, next) => {
//     console.error(err.stack);
//     res.status(500).json({
//         message: err.message,
//         stack: process.env.NODE_ENV === 'production' ? null : err.stack
//     });
// });

// const PORT = process.env.PORT || 5000;

// const { startAbandonedCheckoutJob } = require('./utils/abandonedCheckoutJob');

// const startServer = async () => {
//     try {
//         await connectDB();

//         app.listen(PORT, () => {
//             console.log(`ShopiClone Backend running on port ${PORT}`);
//             if (process.env.NODE_ENV !== 'test') {
//                 startAbandonedCheckoutJob();
//             }
//         });
//     } catch (error) {
//         console.error('Failed to start server:', error);
//     }
// };

// startServer();


const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();
const session = require('express-session');
const passport = require('./config/passport-config');
const { connectDB } = require('./config/db');
const routes = require('./routes');

const app = express();

// CORS configuration
const corsOptions = {
    origin: ['https://shopiclone-clientsite.vercel.app', 'http://localhost:3000'], // Add localhost for development
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware
// Use raw body for Stripe webhooks BEFORE general JSON parsing
app.use('/api/payment/webhook/stripe', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(cors(corsOptions)); // Configure CORS here with options
app.use(morgan('dev'));
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB (but don't start server)
connectDB().catch(console.error);

// Routes
app.use('/api', routes);

app.get('/', (req, res) => {
    res.send(`ShopiClone Backend API is running!, node version: ${process.version}`);
});

// Health check endpoint for Vercel
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`ShopiClone Backend running on port ${PORT}`);
        console.log(`CORS enabled for: ${corsOptions.origin.join(', ')}`);
        const { startAbandonedCheckoutJob } = require('./utils/abandonedCheckoutJob');
        startAbandonedCheckoutJob();
    });
}

// Export for Vercel
module.exports = app;