const mongoose = require('mongoose');

const marketingSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['email', 'sms', 'social'],
        default: 'email',
    },
    status: {
        type: String,
        enum: ['draft', 'scheduled', 'sent', 'active', 'paused'],
        default: 'draft',
    },
    subject: {
        type: String,
    },
    content: {
        type: String, // HTML for emails, text for SMS
    },
    stats: {
        sent: { type: Number, default: 0 },
        opened: { type: Number, default: 0 },
        clicked: { type: Number, default: 0 },
        conversions: { type: Number, default: 0 },
        revenue: { type: Number, default: 0 },
    },
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
    },
    isAutomation: {
        type: Boolean,
        default: false,
    },
    trigger: {
        type: String, // 'abandoned_checkout', 'welcome', 'first_purchase'
    },
    scheduledAt: {
        type: Date,
    },
}, { timestamps: true });

module.exports = mongoose.model('Marketing', marketingSchema);
