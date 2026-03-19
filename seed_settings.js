const mongoose = require('mongoose');
require('dotenv').config();
const SystemSettings = require('./models/SystemSettings');

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shopiclone');
        console.log('Connected to MongoDB');

        let settings = await SystemSettings.findOne({ key: 'main_settings' });
        if (!settings) {
            settings = await SystemSettings.create({
                key: 'main_settings',
                stripe: {
                    mode: 'test',
                    testSecretKey: '',
                    testPublishableKey: '',
                    liveSecretKey: '',
                    livePublishableKey: '',
                    webhookSecret: ''
                }
            });
            console.log('Created default SystemSettings document.');
        } else {
            console.log('SystemSettings already exists.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Seeding Failed:', err);
        process.exit(1);
    }
}

seed();
