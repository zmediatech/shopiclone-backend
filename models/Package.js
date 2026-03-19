const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    pricePKR: {
        type: Number,
        required: true,
        default: 0
    },
    priceUSDT: {
        type: Number,
        required: true,
        default: 0
    },
    durationMonths: {
        type: Number,
        required: true,
        default: 1
    },
    features: [{
        type: String
    }],
    isTrial: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    productLimit: {
        type: Number,
        required: true,
        default: 100
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for ID
packageSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

const Package = mongoose.model('Package', packageSchema);

module.exports = Package;
