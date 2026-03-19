const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true
    },
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment'
    },
    invoiceNumber: {
        type: String,
        required: true,
        unique: true
    },
    items: [{
        description: { type: String, required: true },
        amount: { type: Number, required: true },
        quantity: { type: Number, default: 1 }
    }],
    subtotal: {
        type: Number,
        required: true
    },
    tax: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'PKR'
    },
    status: {
        type: String,
        enum: ['paid', 'unpaid', 'void', 'refunded'],
        default: 'unpaid'
    },
    dueDate: {
        type: Date
    },
    paidAt: {
        type: Date
    },
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
