const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true
    },
    customerId: {
        type: String,
        required: true
    },
    customerName: {
        type: String,
        required: true
    },
    customerEmail: {
        type: String,
        required: true
    },
    items: [{
        productId: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        },
        image: String
    }],
    reason: {
        type: String,
        enum: ['Defective', 'Wrong Item', 'Changed Mind', 'Other'],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Returned', 'Refunded'],
        default: 'Pending'
    },
    refundAmount: {
        type: Number,
        required: true
    },
    images: [String],
    processedAt: Date,
    processedBy: String,
    adminNotes: String
}, {
    timestamps: true
});

// Index for faster queries
returnSchema.index({ customerId: 1, createdAt: -1 });
returnSchema.index({ status: 1, createdAt: -1 });
returnSchema.index({ orderId: 1 });

module.exports = mongoose.model('Return', returnSchema);
