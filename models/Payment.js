const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
    customerEmail: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'pkr' },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
    paymentMethod: { type: String, enum: ['stripe', 'easypaisa', 'jazzcash', 'manual', 'other'], default: 'stripe' },
    transactionType: { type: String, enum: ['subscription_initial', 'subscription_renewal', 'addon_purchase', 'payment'], default: 'payment' },
    stripeCustomerId: String,
    metadata: Object
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
