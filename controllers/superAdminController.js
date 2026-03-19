const Store = require('../models/Store');
const User = require('../models/User');
const Order = require('../models/Order');
const Return = require('../models/Return');
const Package = require('../models/Package');
const SystemSettings = require('../models/SystemSettings');
const { sendEmail } = require('../utils/emailService');

// @desc    Get all stores with stats
// @route   GET /api/superadmin/stores
// @access  Private/SuperAdmin
exports.getAllStores = async (req, res) => {
    try {
        const stores = await Store.find()
            .populate('ownerId', 'name email')
            .populate('subscription.packageId')
            .lean(); // Use lean() for performance and mutability

        // Get stats for each store using an aggregation pipeline on Orders
        const storeStats = await Order.aggregate([
            {
                $group: {
                    _id: "$storeId",
                    totalOrders: { $sum: 1 },
                    totalRevenue: {
                        $sum: { $cond: [{ $ne: ["$status", "Cancelled"] }, "$total", 0] }
                    },
                    uniqueCustomers: { $addToSet: "$customerEmail" }
                }
            },
            {
                $project: {
                    totalOrders: 1,
                    totalRevenue: 1,
                    totalCustomers: { $size: "$uniqueCustomers" }
                }
            }
        ]);

        // Create a map for quick lookup
        const statsMap = {};
        storeStats.forEach(stat => {
            statsMap[stat._id.toString()] = stat;
        });

        // Merge stats into stores
        const storesWithStats = stores.map(store => {
            const stats = statsMap[store._id.toString()] || { totalOrders: 0, totalRevenue: 0, totalCustomers: 0 };
            return {
                ...store,
                stats
            };
        });

        res.json(storesWithStats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get store details by ID
// @route   GET /api/superadmin/stores/:id
// @access  Private/SuperAdmin
exports.getStoreById = async (req, res) => {
    try {
        const store = await Store.findById(req.params.id).populate('ownerId', 'name email');
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        res.json(store);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get store details by ID (Detailed version for Single Shop View)
// @route   GET /api/superadmin/stores/:id/details
// @access  Private/SuperAdmin
exports.getStoreDetailed = async (req, res) => {
    try {
        const storeId = req.params.id;

        // 1. Get Store and Owner Info
        const store = await Store.findById(storeId)
            .populate('ownerId', 'name email phone address city country')
            .populate('subscription.packageId')
            .lean();

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        console.log('Fetching details for store:', storeId, 'OwnerInfo:', store.ownerInfo);

        const ownerEmail = store.ownerId?.email;

        // 2. Get Store Stats (Revenue, Orders, Customers)
        const mongoose = require('mongoose');
        const storeStats = await Order.aggregate([
            { $match: { storeId: new mongoose.Types.ObjectId(storeId) } },
            {
                $group: {
                    _id: "$storeId",
                    totalOrders: { $sum: 1 },
                    totalRevenue: {
                        $sum: { $cond: [{ $ne: ["$status", "Cancelled"] }, "$total", 0] }
                    },
                    uniqueCustomers: { $addToSet: "$customerEmail" }
                }
            },
            {
                $project: {
                    totalOrders: 1,
                    totalRevenue: 1,
                    totalCustomers: { $size: "$uniqueCustomers" }
                }
            }
        ]);

        const stats = storeStats.length > 0 ? storeStats[0] : { totalOrders: 0, totalRevenue: 0, totalCustomers: 0 };

        // 3. Get Recent Payments for this store owner
        let recentPayments = [];
        if (ownerEmail) {
            const Payment = require('../models/Payment');
            recentPayments = await Payment.find({ customerEmail: ownerEmail })
                .populate('packageId', 'name')
                .sort({ createdAt: -1 })
                .limit(10)
                .lean();
        }

        // 4. Get Installed Apps
        const App = require('../models/App');
        const installedApps = await App.find({ storeId }).lean();

        res.json({
            ...store,
            stats,
            recentPayments,
            installedApps
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Export store data (Products, Customers, Orders)
// @route   GET /api/superadmin/stores/:id/export
// @access  Private/SuperAdmin
exports.exportStoreData = async (req, res) => {
    try {
        const storeId = req.params.id;
        const { type } = req.query; // 'products', 'orders', or 'customers'
        let data = [];

        if (type === 'products') {
            const Product = require('../models/Product');
            data = await Product.find({ storeId }).lean();
        } else if (type === 'orders') {
            data = await Order.find({ storeId }).lean();
        } else if (type === 'customers') {
            const orders = await Order.find({ storeId }).select('customerName customerEmail city phone shippingAddress zip').lean();
            const customersMap = new Map();
            orders.forEach(order => {
                if (order.customerEmail && !customersMap.has(order.customerEmail)) {
                    customersMap.set(order.customerEmail, {
                        name: order.customerName,
                        email: order.customerEmail,
                        phone: order.phone,
                        city: order.city,
                        address: order.shippingAddress,
                        zip: order.zip
                    });
                }
            });
            data = Array.from(customersMap.values());
        } else {
            return res.status(400).json({ message: 'Invalid export type. Use products, orders, or customers.' });
        }

        res.json({ type, count: data.length, data });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Import store data (Products)
// @route   POST /api/superadmin/stores/:id/import
// @access  Private/SuperAdmin
exports.importStoreData = async (req, res) => {
    try {
        const storeId = req.params.id;
        const { type } = req.query;
        const { data } = req.body;

        if (!data || !Array.isArray(data)) {
            return res.status(400).json({ message: 'Invalid data format. Expected an array.' });
        }

        if (type === 'products') {
            const Product = require('../models/Product');
            const productsToInsert = data.map(item => {
                const { _id, id, ...rest } = item;
                return {
                    ...rest,
                    storeId
                };
            });
            await Product.insertMany(productsToInsert);
            return res.json({ message: `Successfully imported ${productsToInsert.length} products.` });
        } else {
            return res.status(400).json({ message: 'Only product import is supported currently.' });
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all users
// @route   GET /api/superadmin/users
// @access  Private/SuperAdmin
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').lean();

        // Match users with their stores
        const stores = await Store.find({ ownerId: { $in: users.map(u => u._id) } }).select('name ownerId').lean();
        const storeMap = {};
        stores.forEach(s => {
            storeMap[s.ownerId.toString()] = s.name;
        });

        const usersWithStores = users.map(user => ({
            ...user,
            storeName: storeMap[user._id.toString()] || 'No Store'
        }));

        res.json(usersWithStores);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get global statistics
// @route   GET /api/superadmin/stats
// @access  Private/SuperAdmin
exports.getGlobalStats = async (req, res) => {
    try {
        const totalStores = await Store.countDocuments();
        const totalUsers = await User.countDocuments();
        const totalOrders = await Order.countDocuments();

        // Calculate total revenue across all stores
        const orders = await Order.find({ status: { $ne: 'Cancelled' } });
        const totalRevenue = orders.reduce((acc, order) => acc + (Number(order.total) || 0), 0);

        const totalReturns = await Return.countDocuments();
        const pendingReturns = await Return.countDocuments({ status: 'Pending' });
        const pendingOrders = await Order.countDocuments({ status: 'pending' });

        res.json({
            totalStores,
            totalUsers,
            totalOrders,
            totalRevenue,
            totalReturns,
            pendingReturns,
            pendingOrders
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Package Management ---

exports.getPackages = async (req, res) => {
    try {
        const packages = await Package.find();
        res.json(packages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createPackage = async (req, res) => {
    try {
        const pkg = await Package.create(req.body);
        res.status(201).json(pkg);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updatePackage = async (req, res) => {
    try {
        const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(pkg);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deletePackage = async (req, res) => {
    try {
        await Package.findByIdAndDelete(req.params.id);
        res.json({ message: 'Package deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update store KYC status
// @route   PUT /api/superadmin/stores/:id/kyc
// @access  Private/SuperAdmin
exports.updateStoreKycStatus = async (req, res) => {
    try {
        const { status, remarks } = req.body;
        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const store = await Store.findById(req.params.id);
        if (!store) return res.status(404).json({ message: 'Store not found' });

        store.ownerInfo = {
            ...store.ownerInfo,
            kycStatus: status,
            isKycVerified: status === 'approved'
        };

        await store.save();
        res.json({ message: `KYC status updated to ${status}`, store });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Store Subscription Management ---

exports.updateStoreSubscription = async (req, res) => {
    try {
        const { packageId, durationMonths, isTrial, status, lastPaymentCurrency } = req.body;

        const pkg = await Package.findById(packageId);
        if (!pkg && packageId) {
            return res.status(404).json({ message: 'Package not found' });
        }

        const store = await Store.findById(req.params.id);
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const duration = durationMonths || (pkg ? pkg.durationMonths : 1);
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + duration);

        store.subscription = {
            packageId: packageId || store.subscription?.packageId,
            startDate: new Date(),
            expiryDate,
            isTrial: isTrial !== undefined ? isTrial : (pkg ? pkg.isTrial : false),
            status: status || (isTrial ? 'trial' : 'active'),
            lastPaymentCurrency: lastPaymentCurrency || 'PKR'
        };

        await store.save();
        res.json(store);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- System Settings Management ---

exports.getSystemSettings = async (req, res) => {
    try {
        let settings = await SystemSettings.findOne({ key: 'main_settings' });
        if (!settings) {
            settings = await SystemSettings.create({ key: 'main_settings' });
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateSystemSettings = async (req, res) => {
    try {
        const settings = await SystemSettings.findOneAndUpdate(
            { key: 'main_settings' },
            { $set: req.body },
            { new: true, upsert: true }
        );
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.testSMTPSettings = async (req, res) => {
    try {
        const { smtp } = req.body;
        if (!smtp || !smtp.host) {
            return res.status(400).json({ message: 'SMTP settings are required' });
        }

        await sendEmail({
            to: smtp.fromEmail || req.user.email,
            subject: 'Shopiclone Platform - SMTP Test Email',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 40px; border-radius: 20px;">
                    <h1 style="color: #6366f1;">SMTP Test Successful!</h1>
                    <p style="font-size: 16px; color: #444; line-height: 1.6;">
                        This is a test email to verify your platform's SMTP configuration. If you received this, your settings are working correctly.
                    </p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="font-size: 12px; color: #999; text-align: center;">Sent from Shopiclone Super Admin Panel</p>
                </div>
            `,
            text: 'Shopiclone Platform - SMTP Test Successful! Your settings are working correctly.'
        }, smtp);

        res.json({ message: 'Test email sent successfully' });
    } catch (error) {
        res.status(500).json({ message: `SMTP Error: ${error.message}` });
    }
};

// @desc    Get all orders across all stores
// @route   GET /api/superadmin/orders
// @access  Private/SuperAdmin
exports.getAllOrders = async (req, res) => {
    try {
        const { search, status, storeId, page = 1, limit = 20 } = req.query;

        let query = {};

        if (storeId) {
            query.storeId = storeId;
        }

        if (status && status !== 'All') {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { customerName: { $regex: search, $options: 'i' } },
                { customerEmail: { $regex: search, $options: 'i' } },
                { orderId: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const orders = await Order.find(query)
            .populate('storeId', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Order.countDocuments(query);

        res.json({
            orders,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all returns across all stores
// @route   GET /api/superadmin/returns
// @access  Private/SuperAdmin
exports.getAllReturns = async (req, res) => {
    try {
        const { search, status, storeId, page = 1, limit = 20 } = req.query;

        let query = {};

        if (storeId) {
            query.storeId = storeId;
        }

        if (status && status !== 'All') {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { customerName: { $regex: search, $options: 'i' } },
                { customerEmail: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const returns = await Return.find(query)
            .populate('storeId', 'name')
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
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update return status (super admin)
// @route   PUT /api/superadmin/returns/:id/status
// @access  Private/SuperAdmin
exports.updateReturnStatus = async (req, res) => {
    try {
        const { status, adminNotes } = req.body;
        const returnRequest = await Return.findById(req.params.id);
        if (!returnRequest) {
            return res.status(404).json({ message: 'Return not found' });
        }
        returnRequest.status = status;
        returnRequest.processedAt = new Date();
        returnRequest.processedBy = req.user.id;
        if (adminNotes) returnRequest.adminNotes = adminNotes;
        await returnRequest.save();
        res.json(returnRequest);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
