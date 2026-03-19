const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        default: 'main_settings'
    },
    stripe: {
        testSecretKey: { type: String, default: '' },
        testPublishableKey: { type: String, default: '' },
        liveSecretKey: { type: String, default: '' },
        livePublishableKey: { type: String, default: '' },
        mode: {
            type: String,
            enum: ['test', 'live'],
            default: 'test'
        },
        webhookSecret: { type: String, default: '' }
    },
    smtp: {
        host: { type: String, default: '' },
        port: { type: Number, default: 587 },
        user: { type: String, default: '' },
        pass: { type: String, default: '' },
        fromEmail: { type: String, default: '' },
        fromName: { type: String, default: '' },
        secure: { type: Boolean, default: false }
    }
}, { timestamps: true });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
