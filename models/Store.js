
const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    name: {
        type: String,
        required: true
    },
    logo: {
        type: String,
    },
    currency: {
        type: String,
        default: 'PKR'
    },
    domain: {
        type: String,
        unique: true,
        sparse: true
    },
    customDomain: {
        type: String,
        unique: true,
        sparse: true
    },
    selectedProductId: {
        type: String,
    },
    theme: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    },
    contactInfo: {
        email: String,
        phone: String,
        address: String,
        locationURL: String,
        workingHours: String,
    },
    smtpSettings: {
        host: String,
        port: Number,
        user: String,
        pass: String,
        fromEmail: String,
        fromName: String,
        secure: { type: Boolean, default: true }
    },
    marketingSettings: {
        abandonedCheckoutEnabled: { type: Boolean, default: false },
        welcomeEmailEnabled: { type: Boolean, default: false },
        welcomeEmailSubject: { type: String, default: 'Welcome to our store!' },
        welcomeEmailContent: { type: String, default: 'Thank you for joining our community! We are excited to have you here.' },
        abandonedCheckoutEmailSubject: { type: String, default: 'Wait! You left something in your cart' },
        abandonedCheckoutEmailContent: { type: String, default: 'We noticed you left some items in your cart. We\'ve saved them for you!' }
    },
    paymentSettings: {
        stripeEnabled: { type: Boolean, default: false },
        stripeTestMode: { type: Boolean, default: true },
        stripePublishableKeyTest: String,
        stripeSecretKeyTest: String,
        stripePublishableKeyLive: String,
        stripeSecretKeyLive: String,
        stripeWebhookSecret: String
    },
    twoCheckoutSettings: {
        enabled: { type: Boolean, default: false },
        sellerId: String,
        secretWord: String,
        testMode: { type: Boolean, default: true }
    },
    easypaisaSettings: {
        enabled: { type: Boolean, default: false },
        merchantId: String,
        storeId: String,
        hashKey: String,
        testMode: { type: Boolean, default: true }
    },
    jazzcashSettings: {
        enabled: { type: Boolean, default: false },
        merchantId: String,
        password: { type: String, select: false },
        hashKey: { type: String, select: false },
        testMode: { type: Boolean, default: true }
    },
    subscription: {
        packageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Package'
        },
        startDate: {
            type: Date,
            default: Date.now
        },
        expiryDate: {
            type: Date
        },
        isTrial: {
            type: Boolean,
            default: false
        },
        status: {
            type: String,
            enum: ['active', 'expired', 'trial', 'grace_period', 'cancelled'],
            default: 'trial'
        },
        lastPaymentCurrency: {
            type: String,
            enum: ['PKR', 'USDT'],
            default: 'PKR'
        }
    },
    ownerInfo: {
        name: { type: String, default: '' },
        phone: { type: String, default: '' },
        country: { type: String, default: '' },
        address: { type: String, default: '' },
        cnicFront: { type: String, default: '' },
        cnicBack: { type: String, default: '' },
        isKycVerified: { type: Boolean, default: false },
        kycStatus: {
            type: String,
            enum: ['pending', 'submitted', 'approved', 'rejected'],
            default: 'pending'
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for ID
storeSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

const Store = mongoose.model('Store', storeSchema);

module.exports = Store;
