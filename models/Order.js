
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Store'
    },
    customerName: {
        type: String,
        required: true
    },
    customerEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    total: {
        type: Number,
        required: true
    },
    shippingAddress: {
        type: String,
    },
    city: {
        type: String,
    },
    zip: {
        type: String,
    },
    phone: {
        type: String,
    },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Shipping', 'Shipped', 'Delivered', 'Cancelled', 'Paid'],
        default: 'Pending'
    },
    paymentMethod: {
        type: String,
    },
    discountCode: {
        type: String,
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    items: {
        type: [mongoose.Schema.Types.Mixed],
        required: true
    },
    stripeSessionId: {
        type: String
    },
    stripePaymentIntentId: {
        type: String
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    id: false  // Prevent Mongoose from creating an 'id' virtual and index
});

// Virtual for ID
orderSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
