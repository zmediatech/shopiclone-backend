const Return = require('../models/Return');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Store = require('../models/Store');

// Create a new return request
exports.createReturn = async (req, res) => {
    try {
        const { orderId, customerId, customerName, customerEmail, items, reason, description, refundAmount, images, status } = req.body;

        // Validate order exists
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if return already exists for these specific items in active/completed returns
        const existingReturns = await Return.find({ orderId, status: { $in: ['Pending', 'Approved', 'Returned', 'Refunded'] } });

        for (const newItem of items) {
            const alreadyReturnedQty = existingReturns.reduce((sum, ret) => {
                const matchedItem = ret.items.find(i => i.productId === newItem.productId);
                return sum + (matchedItem ? matchedItem.quantity : 0);
            }, 0);

            const orderItem = order.items.find(i => (i.id || i.productId || i._id).toString() === newItem.productId.toString());
            const totalOrderedQty = orderItem ? orderItem.quantity : 0;

            if (alreadyReturnedQty + newItem.quantity > totalOrderedQty) {
                return res.status(400).json({
                    message: `Cannot return ${newItem.quantity} units of ${newItem.name}. ${alreadyReturnedQty} already in return process out of ${totalOrderedQty} ordered.`
                });
            }
        }

        const returnRequest = new Return({
            orderId,
            storeId: order.storeId,
            customerId,
            customerName,
            customerEmail,
            items,
            reason,
            description,
            refundAmount,
            images: images || [],
            status: status || 'Pending'
        });

        await returnRequest.save();

        // If created as "Returned", restore inventory
        if (returnRequest.status === 'Returned') {
            await restoreInventory(returnRequest.items);
        }

        res.status(201).json(returnRequest);
    } catch (error) {
        console.error('Error creating return:', error);
        res.status(500).json({ message: error.message });
    }
};

// Get all returns (admin)
exports.getAllReturns = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;

        // Scope to active store
        const store = req.store || (req.user ? await Store.findOne({ ownerId: req.user.id }) : null);
        if (!store) return res.status(404).json({ message: 'Store not found or context missing' });

        let query = { storeId: store._id };

        // Filter by status
        if (status && status !== 'All') {
            query.status = status;
        }

        // Search by order ID, customer name, or email
        if (search) {
            query.$or = [
                { customerName: { $regex: search, $options: 'i' } },
                { customerEmail: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const returns = await Return.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Return.countDocuments(query);

        res.json({
            returns,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        console.error('Error fetching returns:', error);
        res.status(500).json({ message: error.message });
    }
};

// Get return by ID
exports.getReturnById = async (req, res) => {
    try {
        const returnRequest = await Return.findById(req.params.id);

        if (!returnRequest) {
            return res.status(404).json({ message: 'Return not found' });
        }

        res.json(returnRequest);
    } catch (error) {
        console.error('Error fetching return:', error);
        res.status(500).json({ message: error.message });
    }
};

// Get returns by customer email
exports.getReturnsByCustomer = async (req, res) => {
    try {
        const { email } = req.params;

        const returns = await Return.find({ customerEmail: email })
            .sort({ createdAt: -1 });

        res.json(returns);
    } catch (error) {
        console.error('Error fetching customer returns:', error);
        res.status(500).json({ message: error.message });
    }
};

// Update return status (admin)
exports.updateReturnStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNotes, processedBy } = req.body;

        const returnRequest = await Return.findById(id);

        if (!returnRequest) {
            return res.status(404).json({ message: 'Return not found' });
        }

        const oldStatus = returnRequest.status;
        returnRequest.status = status;
        returnRequest.processedAt = new Date();

        if (adminNotes) {
            returnRequest.adminNotes = adminNotes;
        }

        if (processedBy) {
            returnRequest.processedBy = processedBy;
        }

        await returnRequest.save();

        // If status changed to "Returned" or "Refunded", restore inventory if not already done
        const isFinishedStatus = ['Returned', 'Refunded'].includes(status);
        const wasFinishedStatus = ['Returned', 'Refunded'].includes(oldStatus);

        if (isFinishedStatus && !wasFinishedStatus) {
            await restoreInventory(returnRequest.items);
        }

        res.json(returnRequest);
    } catch (error) {
        console.error('Error updating return status:', error);
        res.status(500).json({ message: error.message });
    }
};

// Helper function to restore inventory
async function restoreInventory(items) {
    try {
        for (const item of items) {
            await Product.findByIdAndUpdate(
                item.productId,
                { $inc: { inventory: item.quantity } },
                { new: true }
            );
            console.log(`Restored ${item.quantity} units of product ${item.productId}`);
        }
    } catch (error) {
        console.error('Error restoring inventory:', error);
        throw error;
    }
}

// Delete return (admin only, for cleanup)
exports.deleteReturn = async (req, res) => {
    try {
        const { id } = req.params;

        const returnRequest = await Return.findByIdAndDelete(id);

        if (!returnRequest) {
            return res.status(404).json({ message: 'Return not found' });
        }

        res.json({ message: 'Return deleted successfully' });
    } catch (error) {
        console.error('Error deleting return:', error);
        res.status(500).json({ message: error.message });
    }
};
