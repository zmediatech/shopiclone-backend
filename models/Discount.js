const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Store'
    },
    code: {
        type: String,
        required: true,
        uppercase: true,
        trim: true
    },
    percentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    active: {
        type: Boolean,
        default: true
    },
    usageCount: {
        type: Number,
        default: 0
    },
    usageLimit: {
        type: Number,
        default: 1
    },
    isAutomatic: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Ensure codes are unique per store
discountSchema.index({ storeId: 1, code: 1 }, { unique: true });

const Discount = mongoose.model('Discount', discountSchema);

module.exports = Discount;
