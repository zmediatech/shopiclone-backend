const express = require('express');
const router = express.Router();
const {
    getAllStores,
    getStoreById,
    getAllUsers,
    getGlobalStats,
    getPackages,
    createPackage,
    updatePackage,
    deletePackage,
    updateStoreSubscription,
    getSystemSettings,
    updateSystemSettings,
    testSMTPSettings,
    getAllOrders,
    getAllReturns,
    updateReturnStatus,
    getStoreDetailed,
    exportStoreData,
    importStoreData,
    updateStoreKycStatus
} = require('../controllers/superAdminController');
const {
    getAllInvoices,
    getInvoiceDetails,
    getBillingStats,
    refundTransaction
} = require('../controllers/billingController');
const { protect, superAdmin } = require('../middlewares/auth');

// All routes here are protected and require superadmin role
router.use(protect);
router.use(superAdmin);

router.get('/stores', getAllStores);
router.get('/stores/:id', getStoreById);
router.get('/stores/:id/details', getStoreDetailed);
router.get('/stores/:id/export', exportStoreData);
router.post('/stores/:id/import', importStoreData);
router.put('/stores/:id/subscription', updateStoreSubscription);
router.put('/stores/:id/kyc', updateStoreKycStatus);
router.get('/users', getAllUsers);
router.get('/stats', getGlobalStats);

// Orders
router.get('/orders', getAllOrders);

// Returns
router.get('/returns', getAllReturns);
router.put('/returns/:id/status', updateReturnStatus);

// Packages
router.get('/packages', getPackages);
router.post('/packages', createPackage);
router.put('/packages/:id', updatePackage);
router.delete('/packages/:id', deletePackage);

// System Settings
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);
router.post('/settings/test-smtp', testSMTPSettings);

// Billing & Invoices
router.get('/billing/stats', getBillingStats);
router.get('/billing/invoices', getAllInvoices);
router.get('/billing/invoices/:id', getInvoiceDetails);
router.post('/billing/refund', refundTransaction);

// Transactions (Payments)
const Payment = require('../models/Payment');
router.get('/transactions', async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;
        const query = {};
        if (status && status !== 'All') query.status = status;
        if (search) {
            query.$or = [
                { customerEmail: { $regex: search, $options: 'i' } },
                { sessionId: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const transactions = await Payment.find(query)
            .populate('packageId', 'name')
            .populate('invoiceId', 'invoiceNumber')
            .populate('storeId', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Payment.countDocuments(query);
        res.json({ transactions, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
