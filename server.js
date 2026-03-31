
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
    origin: function (origin, callback) {
        // Allow all origins in production if needed, or stick to a whitelist
        // For development, allow any localhost subdomain or port
        if (!origin ||
            origin.startsWith('http://localhost') ||
            origin.endsWith('.localhost:3004') ||
            origin.endsWith('.localhost:3000') ||
            origin.includes('shopiclone-clientsite.vercel.app')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
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

// Database connection middleware (ensures DB is connected before any route is processed)
app.use(async (req, res, next) => {
    // Skip DB connection for health checks and static files
    if (req.path === '/api/health' || req.path.startsWith('/uploads')) {
        return next();
    }

    try {
        await connectDB();
        next();
    } catch (error) {
        console.error('❌ Database connection middleware error:', error);
        res.status(500).json({
            message: 'Database connection failed',
            error: process.env.NODE_ENV === 'production' ? null : error.message
        });
    }
});

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
    app.listen(PORT, async () => {
        console.log(`ShopiClone Backend running on port ${PORT}`);
        console.log(`CORS enabled for dynamic origin validation.`);

        try {
            // Ensure DB is connected before starting background jobs
            await connectDB();
            const { startAbandonedCheckoutJob } = require('./utils/abandonedCheckoutJob');
            startAbandonedCheckoutJob();
        } catch (error) {
            console.error('❌ Failed to start background jobs:', error.message);
        }
    });
}

// Export for Vercel
module.exports = app;