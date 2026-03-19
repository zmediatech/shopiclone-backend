const Store = require('../models/Store');
const Order = require('../models/Order');
const crypto = require('crypto');

// @desc    Prepare JazzCash checkout (Generate form parameters)
// @route   POST /api/payment/jazzcash/prepare
exports.prepareCheckout = async (req, res) => {
    try {
        const { storeId, orderId, amount } = req.body;
        const store = await Store.findById(storeId).select('+jazzcashSettings.password +jazzcashSettings.hashKey');

        if (!store || !store.jazzcashSettings?.enabled) {
            return res.status(400).json({ message: 'JazzCash not enabled' });
        }

        const settings = store.jazzcashSettings;
        const postUrl = settings.testMode
            ? 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchanttest'
            : 'https://jazzcash.com.pk/CustomerPortal/transactionmanagement/merchanttest'; // Update with real production URL if available

        const pp_Amount = Math.round(amount * 100); // Amount in paisas
        const pp_DateTime = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
        const pp_ExpiryDateTime = new Date(Date.now() + 3600000).toISOString().replace(/[-:T.Z]/g, '').slice(0, 14); // 1 hour expiry
        const pp_TxnRefNo = `T${pp_DateTime}`;

        const params = {
            pp_Version: '1.1',
            pp_TxnType: 'MWALLET',
            pp_Language: 'EN',
            pp_MerchantID: settings.merchantId,
            pp_Password: settings.password,
            pp_TxnRefNo,
            pp_Amount,
            pp_TxnCurrency: 'PKR',
            pp_TxnDateTime: pp_DateTime,
            pp_BillReference: orderId,
            pp_Description: `Order ${orderId}`,
            pp_TxnExpiryDateTime: pp_ExpiryDateTime,
            pp_ReturnURL: `${req.headers.origin}/store/order-success?orderId=${orderId}&gateway=jazzcash`,
        };

        // Generate HMAC-SHA256 signature
        const sortedKeys = Object.keys(params).sort();
        const msg = sortedKeys.map(k => params[k]).join('&');
        const signature = crypto.createHmac('sha256', settings.hashKey)
            .update(`${settings.hashKey}&${msg}`)
            .digest('hex')
            .toUpperCase();

        res.json({
            checkoutUrl: postUrl,
            params: { ...params, pp_SecureHash: signature }
        });
    } catch (error) {
        console.error('Jazzcash preparation error:', error);
        res.status(500).json({ message: 'Failed to prepare Jazzcash checkout' });
    }
};

// @desc    Prepare Jazzcash checkout for Package Subscription
// @route   POST /api/payment/jazzcash/subscribe
exports.prepareSubscriptionCheckout = async (req, res) => {
    try {
        const { packageId, pricePKR } = req.body;

        // 1. Get Super Admin JazzCash settings
        const SystemSettings = require('../models/SystemSettings');
        const settingsDoc = await SystemSettings.findOne({ key: 'main_settings' });

        if (!settingsDoc || !settingsDoc.jazzcash || !settingsDoc.jazzcash.merchantId) {
            return res.status(400).json({ message: 'JazzCash integration is not configured by the system admin.' });
        }

        const settings = settingsDoc.jazzcash;
        const sessionId = `PKG_JC_${Date.now()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        // Note: Actual JazzCash integration requires a specific set of parameters 
        // including pp_Version, pp_TxnType, pp_Language, pp_MerchantID, pp_SubMerchantID,
        // pp_Password, pp_BankID, pp_ProductID, pp_TxnRefNo, pp_Amount, pp_TxnCurrency, 
        // pp_TxnDateTime, pp_BillReference, pp_Description, pp_TxnExpiryDateTime, 
        // pp_ReturnURL, pp_SecureHash.

        // This is simplified to provide a working structure.
        const postUrl = settings.mode === 'test'
            ? 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/'
            : 'https://jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/';

        const params = {
            amount: pricePKR.toFixed(2),
            orderRefNum: sessionId,
            merchantId: settings.merchantId,
            postBackURL: `${req.headers.origin}/signup?packageId=${packageId}&session_id=${sessionId}&gateway=jazzcash`,
        };

        res.json({
            checkoutUrl: postUrl,
            params: params,
            sessionId: sessionId
        });

    } catch (error) {
        console.error('Jazzcash subscription preparation error:', error);
        res.status(500).json({ message: 'Failed to prepare Jazzcash subscription checkout' });
    }
};

// @desc    Handle JazzCash IPN (Instant Payment Notification)
// @route   POST /api/payment/jazzcash/ipn
exports.handleIPN = async (req, res) => {
    try {
        const { pp_ResponseCode, pp_BillReference, pp_ResponseDescription } = req.body;

        const orderId = pp_BillReference;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).send('Order not found');
        }

        if (pp_ResponseCode === '000') {
            order.paymentStatus = 'paid';
            order.status = 'Confirmed';
            await order.save();
            console.log(`✅ JazzCash payment confirmed for Order ${orderId}`);
        } else {
            console.log(`❌ JazzCash payment failed for Order ${orderId}: ${pp_ResponseDescription}`);
        }

        res.send('OK');
    } catch (error) {
        console.error('JazzCash IPN error:', error);
        res.status(500).send('Error');
    }
};
