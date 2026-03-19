const Discount = require('../models/Discount');
const Store = require('../models/Store');

exports.getDiscounts = async (req, res) => {
    try {
        const store = await Store.findOne({ ownerId: req.user.id });
        if (!store) return res.status(404).json({ message: 'Store not found' });

        const discounts = await Discount.find({ storeId: store._id });
        res.json(discounts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createDiscount = async (req, res) => {
    try {
        const store = await Store.findOne({ ownerId: req.user.id });
        if (!store) return res.status(404).json({ message: 'Store not found' });

        const discount = await Discount.create({
            ...req.body,
            storeId: store._id
        });
        res.status(201).json(discount);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Discount code already exists' });
        }
        res.status(500).json({ message: error.message });
    }
};

exports.deleteDiscount = async (req, res) => {
    try {
        const discount = await Discount.findById(req.params.id);
        if (!discount) return res.status(404).json({ message: 'Discount not found' });

        await discount.deleteOne();
        res.json({ message: 'Discount removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.validateDiscount = async (req, res) => {
    try {
        const { code, storeId } = req.body;
        if (!code || !storeId) {
            return res.status(400).json({ message: 'Code and storeId are required' });
        }

        const discount = await Discount.findOne({
            code: code.toUpperCase(),
            storeId,
            active: true
        });

        if (!discount) {
            return res.status(404).json({ message: 'Invalid or expired discount code' });
        }

        if (discount.usageCount >= discount.usageLimit) {
            return res.status(400).json({ message: 'Discount code limit reached' });
        }

        res.json({
            code: discount.code,
            percentage: discount.percentage
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAutomaticDiscount = async (req, res) => {
    try {
        const { storeId } = req.params;
        const discount = await Discount.findOne({
            storeId,
            isAutomatic: true,
            active: true
        });

        if (!discount) {
            return res.json(null);
        }

        res.json({
            code: discount.code,
            percentage: discount.percentage
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
