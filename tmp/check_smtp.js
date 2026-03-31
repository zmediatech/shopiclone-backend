const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SystemSettings = require('../models/SystemSettings');

async function checkSmtp() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shopiclone');
        console.log('Connected to MongoDB');

        const system = await SystemSettings.findOne({ key: 'main_settings' });
        if (system && system.smtp) {
            console.log('--- SMTP SETTINGS FOUND ---');
            console.log('Host:', system.smtp.host);
            console.log('Port:', system.smtp.port);
            console.log('Secure:', system.smtp.secure);
            console.log('User:', system.smtp.user);
            console.log('From:', system.smtp.fromEmail);
            console.log('--- END ---');
        } else {
            console.log('No SMTP settings found in SystemSettings');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSmtp();
