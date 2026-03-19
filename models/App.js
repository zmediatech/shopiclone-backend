const mongoose = require('mongoose');

const appSchema = new mongoose.Schema({
    appId: {
        type: String,
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    config: {
        type: Object,
        default: {}
    },
    installedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to ensure uniqueness per store
appSchema.index({ appId: 1, storeId: 1 }, { unique: true });

module.exports = mongoose.model('App', appSchema);
