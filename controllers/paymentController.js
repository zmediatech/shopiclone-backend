const Stripe = require('stripe');
const fs = require('fs');
const Store = require('../models/Store');
const Order = require('../models/Order');

// Create Stripe checkout session
exports.createCheckoutSession = async (req, res) => {
    fs.appendFileSync('controller_hits.txt', `${new Date().toISOString()} - paymentController hit\n`);
    console.log('DEBUG: paymentController.createCheckoutSession hit');
    console.log('DEBUG: req.body:', JSON.stringify(req.body, null, 2));
    try {
        const { storeId, orderId, items, customerInfo, successUrl, cancelUrl } = req.body;

        // Get store payment settings
        const store = await Store.findById(storeId);
        if (!store) {
            return res.status(404).json({ message: 'Store not found - PAYMENT_CONTROLLER' });
        }

        if (!store.paymentSettings?.stripeEnabled) {
            return res.status(400).json({ message: 'Stripe payments not enabled for this store' });
        }

        // Get appropriate Stripe key based on test mode
        const secretKey = store.paymentSettings.stripeTestMode
            ? store.paymentSettings.stripeSecretKeyTest
            : store.paymentSettings.stripeSecretKeyLive;

        if (!secretKey) {
            return res.status(400).json({ message: 'Stripe API key not configured' });
        }

        const stripe = new Stripe(secretKey);

        // Calculate total
        const lineItems = items.map(item => {
            const itemDescription = item.description || '';
            const product_data = {
                name: item.name,
                images: (item.image && typeof item.image === 'string' && item.image.startsWith('http')) ? [item.image] : []
            };

            // Stripe rejects empty strings for description
            if (itemDescription.trim()) {
                product_data.description = itemDescription;
            }

            return {
                price_data: {
                    currency: store.currency?.toLowerCase() || 'pkr',
                    product_data: product_data,
                    unit_amount: Math.round(item.price * 100) // Convert to cents
                },
                quantity: item.quantity
            };
        });

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: successUrl || `${req.headers.origin}/store/order-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${req.headers.origin}/store/checkout`,
            customer_email: customerInfo.email,
            metadata: {
                storeId: String(storeId),
                orderId: String(orderId || ''),
                customerName: String(customerInfo.name || ''),
                customerPhone: String(customerInfo.phone || ''),
                customerAddress: String(customerInfo.address || ''),
                customerCity: String(customerInfo.city || ''),
                customerZip: String(customerInfo.zip || ''),
                customerEmail: String(customerInfo.email || '')
            }
        });

        res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        res.status(500).json({ message: 'Failed to create checkout session', error: error.message });
    }
};

// Verify payment session
exports.verifySession = async (req, res) => {
    try {
        const { sessionId, storeId } = req.query;

        const store = await Store.findById(storeId);
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const secretKey = store.paymentSettings.stripeTestMode
            ? store.paymentSettings.stripeSecretKeyTest
            : store.paymentSettings.stripeSecretKeyLive;

        const stripe = new Stripe(secretKey);

        const mongoose = require('mongoose');
        const isObjectId = mongoose.Types.ObjectId.isValid(sessionId);

        // 1. Check if order already exists for this session (as Stripe session ID or Database ID)
        const query = {
            $or: [
                { stripeSessionId: sessionId }
            ]
        };

        if (isObjectId) {
            query.$or.push({ _id: sessionId });
        }

        const existingOrder = await Order.findOne(query);

        if (existingOrder) {
            // For 2Checkout test orders, we might want to mark as paid if they land here
            if (existingOrder.paymentMethod === '2Checkout' && existingOrder.paymentStatus === 'pending') {
                existingOrder.paymentStatus = 'paid';
                existingOrder.status = 'Confirmed';
                await existingOrder.save();
            }

            return res.json({
                success: true,
                order: existingOrder,
                status: 'already_processed'
            });
        }

        // 2. If no existing order, try to retrieve from Stripe
        if (!sessionId.startsWith('2CO_') && sessionId.length > 24) { // Heuristic for Stripe sessions
            const session = await stripe.checkout.sessions.retrieve(sessionId, {
                expand: ['line_items']
            });

            if (session.payment_status === 'paid') {
                // 3. Map line items back to our order format
                const orderItems = session.line_items?.data.map(item => ({
                    name: item.description,
                    price: item.amount_total / 100 / item.quantity,
                    quantity: item.quantity,
                    // Note: Image and ProductID are harder to get back from line_items without metadata mapping
                    // For now, we use what's available
                })) || [];

                const orderId = session.metadata.orderId;
                let order;

                if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
                    order = await Order.findById(orderId);
                }

                if (order) {
                    order.paymentStatus = 'paid';
                    order.paymentMethod = 'Credit Card';
                    order.stripeSessionId = sessionId;
                    order.stripePaymentIntentId = session.payment_intent;
                    order.status = 'Confirmed';
                } else {
                    // Fallback create if somehow order didn't exist (should not happen with unified flow)
                    order = new Order({
                        storeId: storeId,
                        customerName: session.metadata.customerName,
                        customerEmail: session.customer_email || session.metadata.customerEmail || session.metadata.email,
                        phone: session.metadata.customerPhone,
                        shippingAddress: session.metadata.customerAddress,
                        city: session.metadata.customerCity,
                        zip: session.metadata.customerZip,
                        items: orderItems,
                        total: session.amount_total / 100,
                        paymentStatus: 'paid',
                        paymentMethod: 'Credit Card',
                        stripeSessionId: sessionId,
                        stripePaymentIntentId: session.payment_intent,
                        status: 'Confirmed'
                    });
                }

                await order.save();

                res.json({
                    success: true,
                    order: order,
                    session: {
                        id: session.id,
                        payment_status: session.payment_status,
                        amount_total: session.amount_total
                    }
                });
            } else {
                res.json({ success: false, payment_status: session.payment_status });
            }
        } else {
            res.status(404).json({ message: 'Order or session not found' });
        }
    } catch (error) {
        console.error('Session verification error:', error);
        res.status(500).json({ message: 'Failed to verify session', error: error.message });
    }
};

// Stripe webhook handler
exports.handleWebhook = async (req, res) => {
    try {
        const sig = req.headers['stripe-signature'];
        const storeId = req.query.storeId;

        const store = await Store.findById(storeId);
        if (!store || !store.paymentSettings?.stripeWebhookSecret) {
            return res.status(400).json({ message: 'Invalid webhook configuration' });
        }

        const secretKey = store.paymentSettings.stripeTestMode
            ? store.paymentSettings.stripeSecretKeyTest
            : store.paymentSettings.stripeSecretKeyLive;

        const stripe = new Stripe(secretKey);

        let event;
        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                sig,
                store.paymentSettings.stripeWebhookSecret
            );
        } catch (err) {
            console.error('Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Handle the event
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object;
                console.log('Payment successful:', session.id);
                // Update order status if needed
                const oId = session.metadata.orderId;
                if (oId && mongoose.Types.ObjectId.isValid(oId)) {
                    await Order.findByIdAndUpdate(oId, {
                        paymentStatus: 'paid',
                        status: 'Confirmed',
                        stripeSessionId: session.id,
                        stripePaymentIntentId: session.payment_intent
                    });
                } else {
                    await Order.findOneAndUpdate(
                        { stripeSessionId: session.id },
                        { paymentStatus: 'paid', status: 'Confirmed' }
                    );
                }
                break;
            case 'charge.refunded':
                const charge = event.data.object;
                console.log('Charge refunded:', charge.id);
                await Order.findOneAndUpdate(
                    { stripePaymentIntentId: charge.payment_intent },
                    { paymentStatus: 'refunded', status: 'Cancelled' }
                );
                break;
            case 'payment_intent.payment_failed':
                const paymentIntent = event.data.object;
                console.log('Payment failed:', paymentIntent.id);
                break;
            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ message: 'Webhook handler failed', error: error.message });
    }
};

// Refund an order
exports.refundOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (!order.stripePaymentIntentId) {
            return res.status(400).json({ message: 'Order was not paid via Stripe' });
        }

        const store = await Store.findById(order.storeId);
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const secretKey = store.paymentSettings.stripeTestMode
            ? store.paymentSettings.stripeSecretKeyTest
            : store.paymentSettings.stripeSecretKeyLive;

        if (!secretKey) {
            return res.status(400).json({ message: 'Stripe API key not configured' });
        }

        const stripe = new Stripe(secretKey);

        // Create refund in Stripe
        const refund = await stripe.refunds.create({
            payment_intent: order.stripePaymentIntentId,
        });

        if (refund.status === 'succeeded' || refund.status === 'pending') {
            order.paymentStatus = 'refunded';
            order.status = 'Cancelled';
            await order.save();

            return res.json({
                success: true,
                message: 'Refund processed successfully',
                refundId: refund.id
            });
        } else {
            throw new Error(`Refund status: ${refund.status}`);
        }
    } catch (error) {
        console.error('Refund error:', error);
        res.status(500).json({ message: 'Failed to process refund', error: error.message });
    }
};

// Get store payment configuration (public keys only)
exports.getPaymentConfig = async (req, res) => {
    try {
        const { storeId } = req.params;
        const store = await Store.findById(storeId);

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const publishableKey = store.paymentSettings?.stripeTestMode
            ? store.paymentSettings.stripePublishableKeyTest
            : store.paymentSettings.stripePublishableKeyLive;

        res.json({
            stripeEnabled: store.paymentSettings?.stripeEnabled || false,
            stripePublishableKey: publishableKey,
            currency: store.currency || 'PKR'
        });
    } catch (error) {
        console.error('Get payment config error:', error);
        res.status(500).json({ message: 'Failed to get payment configuration' });
    }
};
