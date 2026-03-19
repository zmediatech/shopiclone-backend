const express = require('express');
const router = express.Router();
const Marketing = require('../models/Marketing');
const User = require('../models/User');
const Store = require('../models/Store');
const { protect } = require('../middlewares/auth');
const { sendEmail } = require('../utils/emailService');

// @desc    Get all campaigns/automations
// @route   GET /api/marketing/campaigns
router.get('/campaigns', protect, async (req, res) => {
    try {
        const campaigns = await Marketing.find({}).sort({ createdAt: -1 });
        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Create a new campaign
// @route   POST /api/marketing/campaigns
router.post('/campaigns', protect, async (req, res) => {
    try {
        const { name, type, status, subject, content, isAutomation, trigger } = req.body;
        const campaign = new Marketing({
            name,
            type,
            status,
            subject,
            content,
            isAutomation,
            trigger
        });
        const createdCampaign = await campaign.save();
        res.status(201).json(createdCampaign);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Update a campaign
// @route   PUT /api/marketing/campaigns/:id
router.put('/campaigns/:id', protect, async (req, res) => {
    try {
        const campaign = await Marketing.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const { name, type, status, subject, content, stats } = req.body;
        campaign.name = name || campaign.name;
        campaign.type = type || campaign.type;
        campaign.status = status || campaign.status;
        campaign.subject = subject || campaign.subject;
        campaign.content = content || campaign.content;
        campaign.stats = stats || campaign.stats;

        const updatedCampaign = await campaign.save();
        res.json(updatedCampaign);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Delete a campaign
// @route   DELETE /api/marketing/campaigns/:id
router.delete('/campaigns/:id', protect, async (req, res) => {
    try {
        const campaign = await Marketing.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        await Marketing.findByIdAndDelete(req.params.id);
        res.json({ message: 'Campaign removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

const AbandonedCheckout = require('../models/AbandonedCheckout');

// @desc    Track a checkout start
// @route   POST /api/marketing/abandoned-checkout/track
router.post('/abandoned-checkout/track', async (req, res) => {
    try {
        const { cartItems, totalAmount, customerEmail, customerName, checkoutToken } = req.body;
        const storeId = req.headers['x-store-id'];

        if (!customerEmail || !storeId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const record = await AbandonedCheckout.findOneAndUpdate(
            { checkoutToken },
            {
                $set: {
                    storeId,
                    customerEmail,
                    customerName,
                    cartItems,
                    totalAmount,
                    status: 'pending',
                    recoveryEmailSent: false // Reset flag so updated cart can trigger a new email
                }
            },
            { upsert: true, new: true, runValidators: true }
        );

        res.json(record);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Send a campaign to all customers
// @route   POST /api/marketing/campaigns/:id/send
router.post('/campaigns/:id/send', protect, async (req, res) => {
    try {
        const campaign = await Marketing.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const storeId = req.headers['x-store-id'];
        const store = await Store.findById(storeId);
        if (!store || !store.smtpSettings || !store.smtpSettings.host) {
            return res.status(400).json({ message: 'SMTP settings not configured for this store' });
        }

        const customers = await User.find({ role: 'customer' });
        console.log(`🚀 Sending campaign "${campaign.name}" to ${customers.length} customers...`);

        let sentCount = 0;
        for (const customer of customers) {
            try {
                await sendEmail({
                    to: customer.email,
                    subject: campaign.subject || `Update from ${store.name}`,
                    html: campaign.content,
                    text: campaign.subject // Simple fallback text
                }, store.smtpSettings);
                sentCount++;
            } catch (err) {
                console.error(`❌ Failed to send campaign email to ${customer.email}:`, err.message);
            }
        }

        campaign.status = 'sent';
        campaign.stats.sent = sentCount;
        await campaign.save();

        res.json({ message: 'Campaign sent successfully', sentCount });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

module.exports = router;
