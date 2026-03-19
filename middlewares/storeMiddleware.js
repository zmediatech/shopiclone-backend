const Store = require('../models/Store');

const storeMiddleware = async (req, res, next) => {
    const storeId = req.headers['x-store-id'];

    if (storeId && storeId !== 'null' && storeId !== 'undefined') {
        try {
            const store = await Store.findById(storeId);
            if (store) {
                // AUTO-DETECT EXPIRY: Check if subscription has ended
                if (store.subscription && store.subscription.expiryDate && store.subscription.status !== 'expired') {
                    const now = new Date();
                    const expiry = new Date(store.subscription.expiryDate);
                    if (now > expiry) {
                        console.log(`📉 Subscriptions: Store ${storeId} membership expired on ${expiry}. Auto-tagging.`);
                        store.subscription.status = 'expired';
                        await store.save();
                    }
                }

                // Verify ownership for non-customer users
                if (req.user && req.user.role !== 'customer' && store.ownerId.toString() !== req.user.id) {
                    console.warn(`Admin ${req.user.id} tried to access store ${storeId} they don't own. Skipping store context.`);
                } else {
                    req.store = store;
                }
            }
        } catch (err) {
            console.error('Invalid Store ID:', storeId);
        }
    }
    next();
};

module.exports = { storeMiddleware };
