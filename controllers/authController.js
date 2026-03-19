const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../utils/emailService');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
        expiresIn: '30d'
    });
};

exports.oauthCallback = async (req, res) => {
    const token = generateToken(req.user.id);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

    let redirectUrl = `${frontendUrl}?token=${token}`;
    console.log('🔗 OAuth Redirect URL:', redirectUrl);

    // Handle signup state persistence
    if (req.query.state) {
        try {
            const state = JSON.parse(Buffer.from(req.query.state, 'base64').toString());

            // If origin is provided in state, use it as the base for redirection
            if (state.origin) {
                redirectUrl = `${state.origin}/auth/callback?token=${token}`;
                console.log('🔄 Using Dynamic Origin for Redirect:', redirectUrl);
            }

            if (state.packageId) redirectUrl += `&packageId=${state.packageId}`;
            if (state.storeName) redirectUrl += `&storeName=${encodeURIComponent(state.storeName)}`;
            if (state.role) redirectUrl += `&role=${state.role}`;
        } catch (err) {
            console.error('Failed to parse OAuth state', err);
        }
    }

    res.redirect(redirectUrl);
};

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const user = await User.create({
            name,
            email,
            password,
            role: req.body.role || 'admin',
            verificationCode,
            verificationCodeExpires
        });

        // Send Verification Email
        try {
            await sendEmail({
                to: user.email,
                subject: 'Verify Your Email - ShopiClone',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 40px; border-radius: 20px;">
                        <h2 style="color: #6366f1;">Welcome to ShopiClone!</h2>
                        <p style="font-size: 16px; color: #444;">Please use the code below to verify your email address:</p>
                        <div style="background: #f4f4f9; padding: 20px; border-radius: 10px; text-align: center; margin: 30px 0;">
                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #6366f1;">${verificationCode}</span>
                        </div>
                        <p style="font-size: 14px; color: #888;">This code will expire in 10 minutes.</p>
                    </div>
                `,
                text: `Your ShopiClone verification code is: ${verificationCode}`
            });
            console.log(`✉️ Verification code sent to ${user.email}`);
        } catch (err) {
            console.error('❌ Failed to send verification email:', err.message);
        }

        res.status(201).json({
            message: 'Verification code sent to email',
            email: user.email
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;
        const user = await User.findOne({
            email,
            verificationCode: code,
            verificationCodeExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification code' });
        }

        user.isVerified = true;
        user.verificationCode = undefined;
        user.verificationCodeExpires = undefined;
        await user.save();

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.resendVerification = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

        user.verificationCode = verificationCode;
        user.verificationCodeExpires = verificationCodeExpires;
        await user.save();

        try {
            await sendEmail({
                to: user.email,
                subject: 'New Verification Code - ShopiClone',
                html: `<h3>Your new verification code is: <b>${verificationCode}</b></h3>`,
                text: `Your new verification code is: ${verificationCode}`
            });
        } catch (err) {
            console.error('❌ Failed to resend verification email:', err.message);
        }

        res.json({ message: 'New verification code sent' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            res.json({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user.id)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            // Don't reveal if user exists for security, or do for UX? User wants "not working" fixed.
            return res.status(404).json({ message: 'User not found with this email' });
        }

        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetPasswordCode = resetCode;
        user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await user.save();

        try {
            await sendEmail({
                to: user.email,
                subject: 'Reset Your Password - ShopiClone',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 40px; border-radius: 20px;">
                        <h2 style="color: #6366f1;">Password Reset Request</h2>
                        <p style="font-size: 16px; color: #444;">You requested a password reset. Use the code below to set a new password:</p>
                        <div style="background: #f4f4f9; padding: 20px; border-radius: 10px; text-align: center; margin: 30px 0;">
                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #6366f1;">${resetCode}</span>
                        </div>
                        <p style="font-size: 14px; color: #888;">This code will expire in 10 minutes. If you didn't request this, please ignore this email.</p>
                    </div>
                `,
                text: `Your ShopiClone password reset code is: ${resetCode}`
            });
            console.log(`✉️ Reset password code sent to ${user.email}`);
        } catch (err) {
            console.error('❌ Failed to send reset email:', err.message);
        }

        res.json({ message: 'Reset code sent to your email' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;
        const user = await User.findOne({
            email,
            resetPasswordCode: code,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset code' });
        }

        user.password = newPassword;
        user.resetPasswordCode = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Password reset successful. You can now login.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
