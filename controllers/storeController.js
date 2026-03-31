const Store = require('../models/Store');
const User = require('../models/User');
const Package = require('../models/Package');
const Payment = require('../models/Payment');

const DEFAULT_THEME = {
    primaryColor: '#6366f1',
    secondaryColor: '#4f46e5',
    backgroundColor: '#ffffff',
    textColor: '#111827',
    fontFamily: 'Inter',
    announcementText: 'LIMITED TIME OFFER: 50% OFF TODAY ONLY!',
    showAnnouncement: true,
    borderRadius: '8px',
    pages: {
        home: [
            { id: 'h1', type: 'hero', settings: { title: 'Elevate Your Space', subtitle: 'Viral home essentials.', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200', buttonText: 'Shop Best Sellers' } },
            { id: 'h2', type: 'scrolling_text', settings: { text: 'FREE GLOBAL SHIPPING • 24/7 CUSTOMER SUPPORT •' } },
            { id: 'h3', type: 'product_details', settings: {} },
            { id: 'h4', type: 'trust_badges', settings: {} }
        ],
        collection: [
            { id: 'c1', type: 'scrolling_text', settings: { text: 'OUR FULL CATALOG • PREMIUM QUALITY •' } },
            { id: 'c2', type: 'collection_grid', settings: {} }
        ],
        contact: [
            { id: 'ct1', type: 'hero', settings: { title: 'Get In Touch', subtitle: 'We respond in less than 24 hours.', image: 'https://images.unsplash.com/photo-1534536281715-e28d76689b4d?auto=format&fit=crop&q=80&w=1200' } },
            { id: 'ct2', type: 'contact_form', settings: {} }
        ]
    }
};


// Get all stores for the logged-in user
exports.getAllStores = async (req, res) => {
    try {
        const stores = await Store.find({ ownerId: req.user.id });
        res.json(stores);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create a new store
exports.createStore = async (req, res) => {
    try {
        const { name, domain, currency, theme, packageId } = req.body;
        const randomCode = Math.random().toString(36).substring(2, 7);

        let subscription = {};
        if (packageId) {
            const pkg = await Package.findById(packageId);
            if (pkg) {
                // Verification for paid packages
                if (!pkg.isTrial) {
                    const { sessionId } = req.body;
                    if (!sessionId) {
                        return res.status(400).json({ message: 'Payment session ID required for paid plans' });
                    }

                    let payment = await Payment.findOne({ sessionId, packageId, status: 'completed' });

                    // AUTO-VERIFY FOR DEVELOPMENT
                    if (!payment && process.env.NODE_ENV !== 'production') {
                        const pendingPayment = await Payment.findOne({ sessionId, packageId, status: 'pending' });
                        if (pendingPayment) {
                            console.log(`🛠️ Dev Mode: Auto-completing pending payment for session: ${sessionId}`);
                            pendingPayment.status = 'completed';
                            await pendingPayment.save();
                            payment = pendingPayment;
                        }
                    }

                    // For EasyPaisa and JazzCash, the payment confirmation happens asynchronously via IPN.
                    // If the user was redirected back, we will create the store but mark the subscription as 'pending'
                    const { gateway } = req.body;
                    let isPendingAsyncPayment = false;

                    if (!payment) {
                        if (gateway === 'easypaisa' || gateway === 'jazzcash') {
                            isPendingAsyncPayment = true;
                            console.log(`⚠️ Async Payment: Proceeding with store creation for ${gateway}, subscription marked pending.`);
                        } else {
                            return res.status(403).json({ message: 'Payment verification failed or session is invalid' });
                        }
                    }

                    const expiryDate = new Date();
                    expiryDate.setMonth(expiryDate.getMonth() + pkg.durationMonths);
                    subscription = {
                        packageId: pkg._id,
                        startDate: new Date(),
                        expiryDate,
                        isTrial: pkg.isTrial,
                        status: isPendingAsyncPayment ? 'pending' : 'active'
                    };
                } else {
                    const expiryDate = new Date();
                    expiryDate.setMonth(expiryDate.getMonth() + pkg.durationMonths);
                    subscription = {
                        packageId: pkg._id,
                        startDate: new Date(),
                        expiryDate,
                        isTrial: pkg.isTrial,
                        status: 'trial'
                    };
                }
            }
        }

        const store = await Store.create({
            ownerId: req.user.id,
            name: name || 'New Store',
            domain: domain || `${randomCode}.localhost`,
            currency: currency || 'PKR',
            theme: theme || DEFAULT_THEME,
            subscription: Object.keys(subscription).length > 0 ? subscription : undefined
        });

        // Link payment to store if session was used
        if (req.body.sessionId) {
            try {
                const Payment = require('../models/Payment');
                await Payment.findOneAndUpdate(
                    { sessionId: req.body.sessionId },
                    { storeId: store._id }
                );
                console.log(`🔗 Linked payment session ${req.body.sessionId} to new store ${store._id}`);
            } catch (payErr) {
                console.error('Failed to link payment to store:', payErr);
            }
        }
        // Upgrade user to admin
        await User.findByIdAndUpdate(req.user.id, { role: 'admin' });
        res.status(201).json(store);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get single store details (context-aware or by ID)
exports.getStore = async (req, res) => {
    try {
        // req.store is populated by middleware if x-store-id is present
        const store = req.store || await Store.findOne({ ownerId: req.user.id });
        if (!store) return res.status(404).json({ message: 'Store not found' });
        res.json(store);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update current store
exports.updateStore = async (req, res) => {
    try {
        const { packageId, ...updateData } = req.body;
        // Use req.store (set by middleware) or fallback to first found (legacy)
        let store = req.store || await Store.findOne({ ownerId: req.user.id });

        // If no store exists, create one first
        if (!store) {
            let subscription = {};
            if (packageId) {
                const pkg = await Package.findById(packageId);
                if (pkg) {
                    const expiryDate = new Date();
                    expiryDate.setMonth(expiryDate.getMonth() + pkg.durationMonths);
                    subscription = {
                        packageId: pkg._id,
                        startDate: new Date(),
                        expiryDate,
                        isTrial: pkg.isTrial,
                        status: pkg.isTrial ? 'trial' : 'active'
                    };
                }
            }

            store = await Store.create({
                ownerId: req.user.id,
                name: req.body.name || 'My Store',
                domain: req.body.domain || `${Math.random().toString(36).substring(2, 7)}.localhost`,
                theme: req.body.theme || DEFAULT_THEME,
                subscription: Object.keys(subscription).length > 0 ? subscription : undefined
            });
            // Upgrade user to admin
            await User.findByIdAndUpdate(req.user.id, { role: 'admin' });
        }

        const updatedStore = await Store.findByIdAndUpdate(
            store._id,
            updateData,
            { new: true }
        );

        // Link payment to store if session was used during update
        if (req.body.sessionId) {
            try {
                const Payment = require('../models/Payment');
                await Payment.findOneAndUpdate(
                    { sessionId: req.body.sessionId },
                    { storeId: updatedStore._id }
                );
                console.log(`🔗 Linked payment session ${req.body.sessionId} to updated store ${updatedStore._id}`);
            } catch (payErr) {
                console.error('Failed to link payment to store during update:', payErr);
            }
        }
        res.json(updatedStore);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Public route for storefront landing
exports.getStoreByDomain = async (req, res) => {
    try {
        let store;
        let { domain } = req.params;
        console.log('🔍 Looking up store for domain:', domain);

        if (domain && domain !== 'default') {
            // Normalize: strip port numbers (e.g. localhost:3000 -> localhost)
            domain = domain.split(':')[0];
            // Normalize: strip www. prefix so www.mybrand.com == mybrand.com
            const bareDomain = domain.replace(/^www\./, '');

            store = await Store.findOne({
                $or: [
                    { domain: domain },
                    { domain: bareDomain },
                    { customDomain: domain },
                    { customDomain: bareDomain },
                ]
            });
        }

        // Fallback to the first store in the system if no domain matched
        if (!store) {
            store = await Store.findOne();
        }

        if (!store) return res.status(404).json({ message: 'No stores available' });
        res.json(store);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteStore = async (req, res) => {
    try {
        const storeId = req.params.id || (req.store ? req.store._id : null);
        if (!storeId) return res.status(400).json({ message: 'Store ID required' });

        const store = await Store.findById(storeId);
        if (!store) return res.status(404).json({ message: 'Store not found' });

        // Ensure owner
        if (store.ownerId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await store.deleteOne();
        res.json({ message: 'Store removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
const { sendEmail } = require('../utils/emailService');

exports.testSMTP = async (req, res) => {
    try {
        const { smtpSettings } = req.body;
        if (!smtpSettings) return res.status(400).json({ message: 'SMTP settings required' });

        await sendEmail({
            to: smtpSettings.user,
            subject: 'ShopiClone SMTP Test',
            html: '<h1>Connection Successful!</h1><p>Your SMTP settings are working correctly.</p>',
            text: 'Connection Successful! Your SMTP settings are working correctly.'
        }, smtpSettings);

        res.json({ message: 'Test email sent successfully' });
    } catch (error) {
        res.status(500).json({ message: 'SMTP Test Failed: ' + error.message });
    }
};

// Update Store KYC info
exports.updateKycInfo = async (req, res) => {
    try {
        const { name, phone, country, address, cnicFront, cnicBack } = req.body;
        let store = req.store || await Store.findOne({ ownerId: req.user.id }).sort({ createdAt: -1 });

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        // Update fields explicitly
        const ownerInfo = { ...(store.ownerInfo || {}) };
        const fields = ['name', 'phone', 'country', 'address', 'cnicFront', 'cnicBack'];

        console.log('Updating KYC for store:', store._id, 'Data:', req.body);

        fields.forEach(field => {
            if (req.body[field] !== undefined) {
                ownerInfo[field] = req.body[field];
            }
        });

        // Auto-update status to submitted when the core fields are added
        if (ownerInfo.name && ownerInfo.cnicFront && ownerInfo.cnicBack) {
            if (ownerInfo.kycStatus === 'pending' || ownerInfo.kycStatus === 'rejected') {
                ownerInfo.kycStatus = 'submitted';
            }
        }

        store.set('ownerInfo', ownerInfo);
        await store.save();

        console.log('KYC updated successfully for store:', store._id);
        res.json(store);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
