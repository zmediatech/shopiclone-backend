const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SystemSettings = require('../models/SystemSettings');

async function updateSmtp() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shopiclone');
        console.log('Connected to MongoDB');

        const system = await SystemSettings.findOne({ key: 'main_settings' });
        if (system && system.smtp) {
            system.smtp.port = 465;
            system.smtp.secure = true;
            await system.save();
            console.log('✅ SMTP settings updated to Port 465 / Secure: true');
        } else {
            console.log('❌ No SMTP settings found to update');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

updateSmtp();
