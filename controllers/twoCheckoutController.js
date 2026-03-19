const Store = require('../models/Store');
const Order = require('../models/Order');
const crypto = require('crypto');

/**
 * Generate 2Checkout Checkout URL and parameters
 */
exports.prepareCheckout = async (req, res) => {
    try {
        const { storeId, cartItems, customerInfo, total, successUrl } = req.body;

        const store = await Store.findById(storeId);
        if (!store || !store.twoCheckoutSettings || !store.twoCheckoutSettings.enabled) {
            return res.status(400).json({ message: '2Checkout is not enabled for this store' });
        }

        const settings = store.twoCheckoutSettings;
        const sellerId = settings.sellerId;

        // 1. Create a pending order in our system first
        const order = new Order({
            storeId: storeId,
            customerName: customerInfo.name,
            customerEmail: customerInfo.email,
            phone: customerInfo.phone,
            shippingAddress: customerInfo.address,
            city: customerInfo.city,
            zip: customerInfo.zip,
            items: cartItems.map(item => ({
                id: item.productId || item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image: item.image
            })),
            total: total,
            paymentStatus: 'pending',
            paymentMethod: '2Checkout',
            status: 'Pending'
        });

        await order.save();

        // 2. Prepare 2Checkout parameters
        const params = {
            sid: sellerId,
            mode: '2CO',
            li_0_type: 'product',
            li_0_name: 'Order from ' + store.name,
            li_0_price: total.toFixed(2),
            li_0_quantity: 1,
            li_0_tangible: 'N',
            currency_code: store.currency || 'USD',
            x_receipt_link_url: successUrl + (successUrl.includes('?') ? '&' : '?') + 'session_id=' + order._id,
            card_holder_name: customerInfo.name,
            email: customerInfo.email,
            phone: customerInfo.phone,
            street_address: customerInfo.address,
            city: customerInfo.city,
            zip: customerInfo.zip,
            demo: settings.testMode ? 'Y' : 'N'
        };

        const checkoutUrl = 'https://www.2checkout.com/checkout/purchase';

        res.json({
            success: true,
            checkoutUrl,
            params
        });

    } catch (error) {
        console.error('2Checkout prepare error:', error);
        res.status(500).json({ message: 'Failed to prepare 2Checkout session', error: error.message });
    }
};

/**
 * Handle 2Checkout IPN (Instant Payment Notification)
 * Note: 2Checkout IPN is complex, this is a simplified version for demonstration
 */
exports.handleIPN = async (req, res) => {
    try {
        const payload = req.body;
        const { storeId } = req.query;

        console.log('2Checkout IPN received:', payload);

        const store = await Store.findById(storeId);
        if (!store) {
            return res.status(404).send('Store not found');
        }

        // Verify hash (Simplified)
        // In a real scenario, you'd calculate the hash based on payload and secretWord
        // and compare it with the 'hash' field in payload.

        const orderNumber = payload.order_number;
        const total = payload.total;

        // Create or update order in our database
        // In this implementation, we can use metadata or custom fields if available in IPN

        res.send('IPN Received');
    } catch (error) {
        console.error('2Checkout IPN error:', error);
        res.status(500).send('IPN processing failed');
    }
};
