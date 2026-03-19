
const express = require('express');
const router = express.Router();
const passport = require('../config/passport-config');
const jwt = require('jsonwebtoken');

// Google OAuth - Initiate
router.get('/google',
    passport.authenticate('google', {
        scope: ['profile', 'email']
    })
);

// Google OAuth - Callback
router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/login?error=google_auth_failed`,
        session: false
    }),
    (req, res) => {
        // Generate JWT token
        const token = jwt.sign(
            { id: req.user._id, email: req.user.email, role: req.user.role },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Redirect to frontend with token
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/callback?token=${token}&provider=google`);
    }
);

// Facebook OAuth - Initiate
router.get('/facebook',
    passport.authenticate('facebook', {
        scope: ['email']
    })
);

// Facebook OAuth - Callback
router.get('/facebook/callback',
    passport.authenticate('facebook', {
        failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/login?error=facebook_auth_failed`,
        session: false
    }),
    (req, res) => {
        // Generate JWT token
        const token = jwt.sign(
            { id: req.user._id, email: req.user.email, role: req.user.role },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Redirect to frontend with token
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/callback?token=${token}&provider=facebook`);
    }
);

module.exports = router;
