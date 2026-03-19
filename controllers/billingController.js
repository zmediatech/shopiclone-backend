const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Store = require('../models/Store');
const Package = require('../models/Package');

// @desc    Generate a new invoice for a successful payment
// @access  Internal
exports.generateInvoice = async (paymentId) => {
    try {
        const payment = await Payment.findById(paymentId).populate('packageId');
        if (!payment) throw new Error('Payment not found');

        const store = await Store.findOne({ ownerId: payment.ownerId }) || await Store.findById(payment.storeId);

        // Generate unique invoice number: INV-YEAR-RANDOM
        const year = new Date().getFullYear();
        const random = Math.floor(1000 + Math.random() * 9000);
        const invoiceNumber = `INV-${year}-${random}-${Date.now().toString().slice(-4)}`;

        const invoice = new Invoice({
            storeId: payment.storeId || (store ? store._id : null),
            paymentId: payment._id,
            invoiceNumber,
            items: [{
                description: payment.packageId?.name ? `Subscription: ${payment.packageId.name}` : 'Platform Subscription',
                amount: payment.amount,
                quantity: 1
            }],
            subtotal: payment.amount,
            total: payment.amount,
            currency: payment.currency || 'PKR',
            status: payment.status === 'completed' ? 'paid' : 'unpaid',
            paidAt: payment.status === 'completed' ? new Date() : null,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        });

        await invoice.save();

        // Link invoice back to payment
        payment.invoiceId = invoice._id;
        await payment.save();

        return invoice;
    } catch (error) {
        console.error('Invoice Generation Error:', error);
        return null;
    }
};

// @desc    Get all invoices for super admin
// @route   GET /api/superadmin/billing/invoices
// @access  Private/SuperAdmin
exports.getAllInvoices = async (req, res) => {
    try {
        const { status, storeId, page = 1, limit = 20 } = req.query;
        const query = {};

        if (status) query.status = status;
        if (storeId) query.storeId = storeId;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const invoices = await Invoice.find(query)
            .populate('storeId', 'name domain')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Invoice.countDocuments(query);

        res.json({
            invoices,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get invoice details
// @route   GET /api/superadmin/billing/invoices/:id
// @access  Private/SuperAdmin
exports.getInvoiceDetails = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id)
            .populate('storeId')
            .populate('paymentId');

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get billing statistics (MRR, Total Revenue)
// @route   GET /api/superadmin/billing/stats
// @access  Private/SuperAdmin
exports.getBillingStats = async (req, res) => {
    try {
        // Calculate total revenue from paid invoices
        const revenueData = await Invoice.aggregate([
            { $match: { status: 'paid' } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$total" },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Calculate MRR (simple version: sum of all active package prices per month)
        // This would be more accurate if we tracked subscription periods
        const activeStores = await Store.find({ 'subscription.status': 'active' }).populate('subscription.packageId');
        let mrr = 0;
        activeStores.forEach(store => {
            if (store.subscription?.packageId) {
                const pkg = store.subscription.packageId;
                mrr += (pkg.pricePKR / (pkg.durationMonths || 1));
            }
        });

        res.json({
            totalRevenue: revenueData.length > 0 ? revenueData[0].totalRevenue : 0,
            invoiceCount: revenueData.length > 0 ? revenueData[0].count : 0,
            mrr
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Process a refund for a platform payment
// @route   POST /api/superadmin/billing/refund
// @access  Private/SuperAdmin
exports.refundTransaction = async (req, res) => {
    try {
        const { paymentId, reason } = req.body;
        const payment = await Payment.findById(paymentId);

        if (!payment) {
            return res.status(404).json({ message: 'Payment record not found' });
        }

        if (payment.status === 'refunded') {
            return res.status(400).json({ message: 'Payment already refunded' });
        }

        const SystemSettings = require('../models/SystemSettings');
        const settings = await SystemSettings.findOne({ key: 'main_settings' });
        if (!settings?.stripe?.testSecretKey && !settings?.stripe?.liveSecretKey) {
            return res.status(400).json({ message: 'Stripe is not configured on this platform' });
        }

        const stripe = require('stripe')(settings.stripe.mode === 'live' ? settings.stripe.liveSecretKey : settings.stripe.testSecretKey);

        // Retrieve session to get payment intent
        const session = await stripe.checkout.sessions.retrieve(payment.sessionId);
        if (!session.payment_intent) {
            return res.status(400).json({ message: 'No payment intent found for this session' });
        }

        // Process refund
        const refund = await stripe.refunds.create({
            payment_intent: session.payment_intent,
            reason: reason || 'requested_by_customer'
        });

        if (refund.status === 'succeeded' || refund.status === 'pending') {
            payment.status = 'refunded';
            await payment.save();

            // Update invoice status if it exists
            if (payment.invoiceId) {
                await Invoice.findByIdAndUpdate(payment.invoiceId, { status: 'refunded' });
            }

            res.json({ success: true, message: 'Refund processed successfully', refund });
        } else {
            throw new Error(`Refund failed with status: ${refund.status}`);
        }
    } catch (error) {
        console.error('Refund Error:', error);
        res.status(500).json({ message: error.message });
    }
};
