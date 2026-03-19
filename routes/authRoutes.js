
const express = require('express');
const router = express.Router();
const { register, login, oauthCallback, verifyEmail, resendVerification, forgotPassword, resetPassword } = require('../controllers/authController');
const passport = require('passport');

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Google OAuth
router.get('/google', (req, res, next) => {
    const { packageId, storeName, role, origin } = req.query;
    const state = Buffer.from(JSON.stringify({ packageId, storeName, role, origin })).toString('base64');
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: state
    })(req, res, next);
});

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    oauthCallback
);

// Facebook OAuth
router.get('/facebook', (req, res, next) => {
    const { packageId, storeName, role, origin } = req.query;
    const state = Buffer.from(JSON.stringify({ packageId, storeName, role, origin })).toString('base64');
    passport.authenticate('facebook', {
        scope: ['email'],
        state: state
    })(req, res, next);
});

router.get('/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    oauthCallback
);

module.exports = router;
