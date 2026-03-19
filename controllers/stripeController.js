const stripe = require('stripe');
const fs = require('fs');
const SystemSettings = require('../models/SystemSettings');
const Package = require('../models/Package');
const Store = require('../models/Store');
const Payment = require('../models/Payment');
const { generateInvoice } = require('./billingController');

const getStripeInstance = async () => {
    const settings = await SystemSettings.findOne({ key: 'main_settings' });
    if (!settings || !settings.stripe) {
        throw new Error('Stripe is not configured. Please set up Stripe keys in the Super Admin dashboard.');
    }

    const { mode, testSecretKey, liveSecretKey } = settings.stripe;
    const secretKey = mode === 'live' ? liveSecretKey : testSecretKey;

    if (!secretKey) {
        throw new Error(`Stripe ${mode} secret key is missing. Please enter it in the Super Admin dashboard.`);
    }

    return stripe(secretKey);
};

// @desc    Create Stripe Checkout Session for Subscription
// @route   POST /api/payments/create-checkout-session
// @access  Public (or semi-public with temporary token)
exports.createCheckoutSession = async (req, res) => {
    console.log('DEBUG: stripeController.createCheckoutSession hit');
    console.log('DEBUG: req.body:', JSON.stringify(req.body, null, 2));
    try {
        const { packageId, customerEmail, successUrl, cancelUrl, storeId } = req.body;

        const pkg = await Package.findById(packageId);
        if (!pkg) {
            return res.status(404).json({ message: 'Package not found - STRIPE_CONTROLLER' });
        }

        const stripeInstance = await getStripeInstance();

        const session = await stripeInstance.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: customerEmail || undefined,
            line_items: [
                {
                    price_data: {
                        currency: 'pkr',
                        product_data: {
                            name: pkg.name,
                            description: `${pkg.durationMonths} month subscription`,
                        },
                        unit_amount: pkg.pricePKR * 100, // Stripe uses cents/smallest unit
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                packageId: pkg._id.toString(),
                customerEmail: customerEmail || '',
                storeId: storeId || ''
            }
        });

        // Create a pending payment record
        await Payment.create({
            sessionId: session.id,
            packageId: pkg._id,
            storeId: storeId || null,
            customerEmail: customerEmail,
            amount: pkg.pricePKR,
            currency: 'pkr',
            status: 'pending'
        });

        res.json({ id: session.id, url: session.url });
    } catch (error) {
        console.error('Stripe session error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Handle Stripe Webhook
// @route   POST /api/payments/webhook/stripe
// @access  Public
exports.handleWebhook = async (req, res) => {
    const settings = await SystemSettings.findOne({ key: 'main_settings' });
    const sig = req.headers['stripe-signature'];
    const webhookSecret = settings?.stripe?.webhookSecret;

    let event;

    try {
        const stripeInstance = await getStripeInstance();
        event = stripeInstance.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        // Ensure storeId is valid or undefined (don't overwrite with empty string)
        const updateData = {
            status: 'completed',
            stripeCustomerId: session.customer,
            customerEmail: session.customer_details?.email || session.customer_email,
        };

        if (session.metadata && session.metadata.storeId) {
            updateData.storeId = session.metadata.storeId;
        }

        // Update payment record
        const payment = await Payment.findOneAndUpdate(
            { sessionId: session.id },
            updateData,
            { new: true }
        );

        if (payment) {
            console.log('Payment completed for session:', session.id);
            // Generate Invoice
            await generateInvoice(payment._id);
        }
    }

    res.json({ received: true });
};

// @desc    Manually simulate a successful payment (DEVELOPMENT ONLY)
// @route   POST /api/payment/simulate-success
// @access  Public (should be protected in prod)
exports.simulateSuccess = async (req, res) => {
    try {
        const { sessionId, storeId } = req.body;
        if (!sessionId) return res.status(400).json({ message: 'Session ID required' });

        const updateData = {
            status: 'completed',
            customerEmail: req.body.customerEmail || 'simulated@example.com'
        };

        if (storeId) updateData.storeId = storeId;

        const payment = await Payment.findOneAndUpdate(
            { sessionId },
            updateData,
            { new: true }
        );

        if (!payment) return res.status(404).json({ message: 'Payment record not found' });

        console.log('--- DEVELOPMENT SIMULATION ---');
        console.log('Payment manually marked as completed for session:', sessionId);

        res.json({ message: 'Simulation successful', payment });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
