const nodemailer = require('nodemailer');

const sendEmail = async (options, smtpSettings = null) => {
    let settings = smtpSettings;

    // 1. Fallback to Global System Settings if no specific settings provided
    if (!settings || !settings.host) {
        try {
            const SystemSettings = require('../models/SystemSettings');
            const system = await SystemSettings.findOne({ key: 'main_settings' });
            if (system && system.smtp && system.smtp.host) {
                settings = system.smtp;
            }
        } catch (error) {
            console.error('Error fetching global SMTP settings:', error);
        }
    }

    // 2. Fallback to Environment Variables
    if (!settings || !settings.host) {
        if (process.env.SMTP_HOST) {
            settings = {
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
                secure: process.env.SMTP_SECURE === 'true',
                fromEmail: process.env.SMTP_FROM_EMAIL,
                fromName: process.env.SMTP_FROM_NAME || 'Shopiclone',
            };
        }
    }

    if (!settings || !settings.host) {
        console.warn('⚠️ SMTP settings are missing - email will not be sent');
        return null;
    }

    const transporter = nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.secure !== false,
        auth: {
            user: settings.user,
            pass: settings.pass,
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    const mailOptions = {
        from: `"${settings.fromName}" <${settings.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
    };

    return await transporter.sendMail(mailOptions);
};

module.exports = { sendEmail };
