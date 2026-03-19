const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`,
    passReqToCallback: true
},
    async (req, accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists
            let user = await User.findOne({ googleId: profile.id });

            if (!user) {
                // Check if user exists with same email
                user = await User.findOne({ email: profile.emails[0].value });

                if (user) {
                    // Link Google account to existing user
                    user.googleId = profile.id;
                    user.provider = 'google';
                    await user.save();
                } else {
                    // Extract role from state if present
                    let role = 'admin'; // Default for admin portal signup
                    if (req.query.state) {
                        try {
                            const state = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
                            if (state.role) role = state.role;
                        } catch (e) {
                            console.error('Failed to parse state in passport', e);
                        }
                    }

                    // Create new user
                    user = await User.create({
                        name: profile.displayName,
                        email: profile.emails[0].value,
                        googleId: profile.id,
                        provider: 'google',
                        role: role
                    });
                }
            }

            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }));

// Facebook OAuth Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/facebook/callback`,
    profileFields: ['id', 'displayName', 'emails'],
    passReqToCallback: true
},
    async (req, accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists
            let user = await User.findOne({ facebookId: profile.id });

            if (!user) {
                // Check if user exists with same email
                const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.id}@facebook.com`;
                user = await User.findOne({ email });

                if (user) {
                    // Link Facebook account to existing user
                    user.facebookId = profile.id;
                    user.provider = 'facebook';
                    await user.save();
                } else {
                    // Extract role from state if present
                    let role = 'admin';
                    if (req.query.state) {
                        try {
                            const state = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
                            if (state.role) role = state.role;
                        } catch (e) {
                            console.error('Failed to parse state in passport', e);
                        }
                    }

                    // Create new user
                    user = await User.create({
                        name: profile.displayName,
                        email,
                        facebookId: profile.id,
                        provider: 'facebook',
                        role: role
                    });
                }
            }

            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }));

module.exports = passport;
