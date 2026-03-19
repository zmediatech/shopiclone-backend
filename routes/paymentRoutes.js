const express = require('express');
const router = express.Router();
const { createCheckoutSession: createSubscriptionSession, handleWebhook: handleSubscriptionWebhook, simulateSuccess } = require('../controllers/stripeController');
const { createCheckoutSession: createStoreCheckoutSession, verifySession, handleWebhook: handleStoreWebhook } = require('../controllers/paymentController');
const { prepareSubscriptionCheckout: prepareEasypaisaSub, prepareCheckout: prepareEasypaisaStore } = require('../controllers/easypaisaController');
const { prepareSubscriptionCheckout: prepareJazzcashSub, prepareCheckout: prepareJazzcashStore } = require('../controllers/jazzcashController');

// --- SUBSCRIPTION ROUTES (Super Admin) ---
router.post('/create-checkout-session', createSubscriptionSession); // Stay for backwards compat if needed, but better to use specific ones
router.post('/simulate-success', simulateSuccess);
router.post('/easypaisa/subscribe', prepareEasypaisaSub);
router.post('/jazzcash/subscribe', prepareJazzcashSub);

// --- STOREFRONT FLOWS (Customers) ---
router.post('/checkout/session', createStoreCheckoutSession); // Better name
router.get('/verify-session', verifySession);
router.post('/webhook/store', handleStoreWebhook);
router.post('/easypaisa/prepare', prepareEasypaisaStore);
router.post('/jazzcash/prepare', prepareJazzcashStore);

// Backwards compatibility for frontend calls
router.post('/create-checkout-session', (req, res, next) => {
    if (req.body.packageId) return createSubscriptionSession(req, res, next);
    return createStoreCheckoutSession(req, res, next);
});

// Webhook needs raw body, handled in server.js specifically
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), handleSubscriptionWebhook);

module.exports = router;
