
const User = require('../models/User');
const Order = require('../models/Order');
const Store = require('../models/Store');

exports.updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;

            if (req.body.password) {
                user.password = req.body.password;
            }

            // Address fields
            user.address = req.body.address || user.address;
            user.city = req.body.city || user.city;
            user.zip = req.body.zip || user.zip;
            user.country = req.body.country || user.country;
            user.phone = req.body.phone || user.phone;

            const updatedUser = await user.save();

            res.json({
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                address: updatedUser.address,
                city: updatedUser.city,
                zip: updatedUser.zip,
                country: updatedUser.country,
                phone: updatedUser.phone,
                token: req.body.token // Optional: if we want to refresh token
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('SERVER ERROR - updateProfile:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user) {
            res.json({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                address: user.address,
                city: user.city,
                zip: user.zip,
                country: user.country,
                phone: user.phone
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('SERVER ERROR - getUserProfile:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getCustomers = async (req, res) => {
    try {
        const store = req.store || await Store.findOne({ ownerId: req.user.id });
        if (!store) return res.status(404).json({ message: 'Store not found' });

        // 1. Find all users who have ordered from this store
        // We aggregate to find unique emails and sum their totals
        const orderStats = await Order.aggregate([
            { $match: { storeId: store._id } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$customerEmail",
                    name: { $first: "$customerName" },
                    city: { $first: "$city" },
                    ordersCount: { $sum: 1 },
                    totalSpent: { $sum: "$total" },
                    lastOrder: { $max: "$createdAt" }
                }
            },
            { $sort: { lastOrder: -1 } }
        ]);

        // 2. Cross-reference with User accounts if they exist
        const emails = orderStats.map(stat => stat._id);
        const registeredUsers = await User.find({ email: { $in: emails } });

        const customers = orderStats.map(stat => {
            const registered = registeredUsers.find(u => u.email === stat._id);
            return {
                id: registered ? registered.id : `guest-${stat._id}`,
                name: stat.name || (registered ? registered.name : 'Unknown'),
                email: stat._id,
                ordersCount: stat.ordersCount,
                totalSpent: stat.totalSpent,
                lastOrder: stat.lastOrder,
                isRegistered: !!registered,
                city: stat.city || (registered ? registered.city : 'Unknown'),
                createdAt: registered ? registered.createdAt : stat.lastOrder
            };
        });

        // 3. Also include registered customers who haven't ordered yet (optional)
        // For now, let's stick to people who "orders products" as requested.

        res.json(customers);
    } catch (error) {
        console.error('SERVER ERROR - getCustomers:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getCustomerDetails = async (req, res) => {
    try {
        console.log('DEBUG: getCustomerDetails hit for email:', req.params.email);
        const store = req.store || await Store.findOne({ ownerId: req.user.id });
        if (!store) {
            console.log('DEBUG: Store not found for ownerId:', req.user.id);
            return res.status(404).json({ message: 'Store not found' });
        }

        const { email } = req.params;

        // 1. Get User info
        const user = await User.findOne({ email });

        // 2. Get all orders for this email in this store
        const orders = await Order.find({
            storeId: store._id,
            customerEmail: email
        }).sort({ createdAt: -1 });

        // 3. Aggregate stats
        const stats = {
            totalSpent: orders.reduce((sum, o) => sum + o.total, 0),
            ordersCount: orders.length,
            lastOrder: orders.length > 0 ? orders[0].createdAt : null,
            firstOrder: orders.length > 0 ? orders[orders.length - 1].createdAt : null
        };

        res.json({
            user: user ? {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: user.address,
                city: user.city,
                zip: user.zip,
                country: user.country,
                createdAt: user.createdAt
            } : {
                name: orders[0]?.customerName || 'Guest User',
                email: email,
                isGuest: true
            },
            orders,
            stats
        });
    } catch (error) {
        console.error('SERVER ERROR - getCustomerDetails:', error);
        res.status(500).json({ message: error.message });
    }
};
