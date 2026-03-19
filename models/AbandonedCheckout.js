const mongoose = require('mongoose');

const abandonedCheckoutSchema = new mongoose.Schema({
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true
    },
    customerEmail: {
        type: String,
        required: true
    },
    customerName: {
        type: String
    },
    cartItems: [{
        productId: String,
        name: String,
        price: Number,
        quantity: Number,
        image: String
    }],
    totalAmount: {
        type: Number
    },
    status: {
        type: String,
        enum: ['pending', 'recovered', 'expired'],
        default: 'pending'
    },
    recoveryEmailSent: {
        type: Boolean,
        default: false
    },
    recoveryEmailSentAt: {
        type: Date
    },
    checkoutToken: {
        type: String,
        unique: true
    }
}, { timestamps: true });

module.exports = mongoose.model('AbandonedCheckout', abandonedCheckoutSchema);
