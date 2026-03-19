const Order = require('../models/Order');
const Store = require('../models/Store');
const Product = require('../models/Product');
const Return = require('../models/Return');
const Discount = require('../models/Discount');
const AbandonedCheckout = require('../models/AbandonedCheckout');

exports.getOrders = async (req, res) => {
    try {
        const { view } = req.query;
        let query = {};

        // If view=purchases OR user is NOT an admin, show their personal orders by email
        if (view === 'purchases' || req.user.role !== 'admin') {
            query = { customerEmail: req.user.email.toLowerCase() };

            // If storeId is provided in query, further scope it
            if (req.query.storeId) {
                query.storeId = req.query.storeId;
            }
        } else {
            // Admin sales view
            const store = req.store || await Store.findOne({ ownerId: req.user.id });
            if (!store) return res.status(404).json({ message: 'Store not found' });
            query = { storeId: store._id };
        }

        const orders = await Order.find(query).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('SERVER ERROR - getOrders:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.createOrder = async (req, res) => {
    try {
        const { storeId, checkoutToken, discountCode, ...orderData } = req.body;

        // Ensure storeId is valid
        if (!storeId) {
            return res.status(400).json({ message: 'Store ID is required' });
        }

        // Check if store exists 
        let store;
        try {
            store = await Store.findById(storeId);
        } catch (err) {
            if (err.name !== 'CastError') throw err;
        }

        if (!store) {
            if (storeId === 'default') store = await Store.findOne();
            if (!store) return res.status(404).json({ message: 'Store not found' });
        }

        // Handle Discount & Total calculation
        let discountAmount = 0;
        let appliedCode = null;
        const subtotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        if (discountCode) {
            const discount = await Discount.findOne({
                code: discountCode.toUpperCase(),
                storeId: store._id,
                active: true
            });

            if (discount && discount.usageCount < discount.usageLimit) {
                discountAmount = (subtotal * discount.percentage) / 100;
                appliedCode = discount.code;

                // Increment usage
                discount.usageCount += 1;
                await discount.save();
            }
        }

        const finalTotal = subtotal - discountAmount;

        const newOrder = new Order({
            ...orderData,
            storeId: store._id,
            total: finalTotal,
            discountCode: appliedCode,
            discountAmount
        });

        const savedOrder = await newOrder.save();

        // DECREMENT INVENTORY
        if (orderData.items && Array.isArray(orderData.items)) {
            for (const item of orderData.items) {
                try {
                    const product = await Product.findById(item.productId);
                    if (product) {
                        // Deduct base product inventory
                        product.inventory = Math.max(0, (product.inventory || 0) - (item.quantity || 1));

                        // Deduct specific variant inventory if purchased
                        if (item.variantSku && product.variants) {
                            const variant = product.variants.find(v => v.sku === item.variantSku);
                            if (variant) {
                                variant.inventory = Math.max(0, (variant.inventory || 0) - (item.quantity || 1));
                            }
                        } else if (item.variant && product.variants) {
                            // Fallback heuristic if variant text is present
                            const variantTextValues = item.variant.split(',').map(s => s.split(': ')[1]?.trim()).filter(Boolean);
                            const variant = product.variants.find(v => {
                                const vVals = Object.values(v.options || {});
                                return variantTextValues.every(val => vVals.includes(val)) && vVals.length === variantTextValues.length;
                            });
                            if (variant) {
                                variant.inventory = Math.max(0, (variant.inventory || 0) - (item.quantity || 1));
                            }
                        }

                        await product.save();
                    }
                } catch (err) {
                    console.error(`Failed to update inventory for product ${item.productId}:`, err);
                }
            }
        }

        if (checkoutToken) {
            await AbandonedCheckout.findOneAndUpdate(
                { checkoutToken },
                { status: 'recovered' }
            );
        }

        res.status(201).json(savedOrder);
    } catch (error) {
        console.error("Orders SERVER ERROR - createOrder:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        order.status = req.body.status;
        await order.save();
        res.json(order);
    } catch (error) {
        console.error('Orders SERVER ERROR - updateOrderStatus:', error);
        res.status(500).json({
            message: 'Internal Server Error during status update',
            error: error.message
        });
    }
};

exports.trackOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .select('status customerName createdAt items total city shippingAddress discountCode discountAmount');

        if (!order) return res.status(404).json({ message: 'Order not found' });

        const returnRequest = await Return.findOne({ orderId: order._id });

        res.json({
            ...order.toObject(),
            returnRequest: returnRequest ? {
                status: returnRequest.status,
                reason: returnRequest.reason,
                refundAmount: returnRequest.refundAmount,
                createdAt: returnRequest.createdAt
            } : null
        });
    } catch (error) {
        console.error('Orders SERVER ERROR - trackOrder:', error);
        res.status(500).json({ message: 'Error fetching order details' });
    }
};
