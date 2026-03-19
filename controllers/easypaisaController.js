const Store = require('../models/Store');
const Order = require('../models/Order');
const crypto = require('crypto');

// @desc    Prepare Easypaisa checkout (Generate form parameters)
// @route   POST /api/payment/easypaisa/prepare
exports.prepareCheckout = async (req, res) => {
    try {
        const { storeId, orderId, amount } = req.body;
        const store = await Store.findById(storeId);

        if (!store || !store.easypaisaSettings?.enabled) {
            return res.status(400).json({ message: 'Easypaisa not enabled' });
        }

        const settings = store.easypaisaSettings;
        const postUrl = settings.testMode
            ? 'https://easypay.easypaisa.com.pk/easypay/Index.jsf'
            : 'https://easypay.easypaisa.com.pk/easypay/Index.jsf'; // URLs might differ for prod, but usually these are provided by documentation

        // Note: Actual Easypaisa integration usually involves specific mandatory fields
        // and a hash/signature generation based on a shared secret (hashKey).
        // This is a simplified representation of the preparation logic.

        const params = {
            amount: amount.toFixed(2),
            orderRefNum: orderId,
            merchantId: settings.merchantId,
            storeId: settings.storeId,
            postBackURL: `${req.headers.origin}/store/order-success?orderId=${orderId}&gateway=easypaisa`,
        };

        // Example signature generation (Conceptual - Easypaisa usually has a specific algorithm)
        // const sortedString = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
        // params.hash = crypto.createHmac('sha256', settings.hashKey).update(sortedString).digest('hex');

        res.json({
            checkoutUrl: postUrl,
            params: params
        });
    } catch (error) {
        console.error('Easypaisa preparation error:', error);
        res.status(500).json({ message: 'Failed to prepare Easypaisa checkout' });
    }
};

// @desc    Prepare Easypaisa checkout for Package Subscription
// @route   POST /api/payment/easypaisa/subscribe
exports.prepareSubscriptionCheckout = async (req, res) => {
    try {
        const { packageId, pricePKR } = req.body;

        // 1. Get Super Admin EasyPaisa settings
        const SystemSettings = require('../models/SystemSettings');
        const settingsDoc = await SystemSettings.findOne({ key: 'main_settings' });

        if (!settingsDoc || !settingsDoc.easypaisa || !settingsDoc.easypaisa.storeId) {
            return res.status(400).json({ message: 'Easypaisa integration is not configured by the system admin.' });
        }

        const settings = settingsDoc.easypaisa;

        // 2. Generate a unique session order ID for the subscription attempt
        const sessionId = `PKG_${Date.now()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        const postUrl = settings.mode === 'test'
            ? 'https://easypaystg.easypaisa.com.pk/easypay/Index.jsf'
            : 'https://easypay.easypaisa.com.pk/easypay/Index.jsf';

        // 3. Construct parameters
        const params = {
            amount: pricePKR.toFixed(2),
            orderRefNum: sessionId,
            merchantId: settings.storeId, // storeId usually acts as merchant ID in some api versions, or requires both
            storeId: settings.storeId,
            postBackURL: `${req.headers.origin}/signup?packageId=${packageId}&session_id=${sessionId}&gateway=easypaisa`,
        };

        // Return form params
        res.json({
            checkoutUrl: postUrl,
            params: params,
            sessionId: sessionId
        });

    } catch (error) {
        console.error('Easypaisa subscription preparation error:', error);
        res.status(500).json({ message: 'Failed to prepare Easypaisa subscription checkout' });
    }
};

// @desc    Handle Easypaisa IPN (Instant Payment Notification)
// @route   POST /api/payment/easypaisa/ipn
exports.handleIPN = async (req, res) => {
    try {
        const { orderRefNum, status, authCode, responseCode } = req.body;

        // Find order by reference
        const order = await Order.findById(orderRefNum);
        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Potential security check: Verify signature here using hashKey

        if (responseCode === '0000' || status === 'PAID') {
            order.paymentStatus = 'paid';
            order.status = 'Confirmed';
            await order.save();
            console.log(`✅ Easypaisa payment confirmed for Order ${orderRefNum}`);
        }

        res.send('OK'); // Easypaisa expects an acknowledgment
    } catch (error) {
        console.error('Easypaisa IPN error:', error);
        res.status(500).send('Error');
    }
};
