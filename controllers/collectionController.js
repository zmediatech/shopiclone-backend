const Collection = require('../models/Collection');
const Store = require('../models/Store');

exports.getCollections = async (req, res) => {
    try {
        const store = await Store.findOne({ ownerId: req.user.id });
        if (!store) return res.status(404).json({ message: 'Store not found' });

        const collections = await Collection.find({ storeId: store._id });
        res.json(collections);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createCollection = async (req, res) => {
    try {
        const store = await Store.findOne({ ownerId: req.user.id });
        if (!store) return res.status(404).json({ message: 'Store not found' });

        const collection = await Collection.create({
            ...req.body,
            storeId: store._id
        });
        res.status(201).json(collection);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteCollection = async (req, res) => {
    try {
        const collection = await Collection.findById(req.params.id);
        if (!collection) return res.status(404).json({ message: 'Collection not found' });

        await collection.deleteOne();
        res.json({ message: 'Collection removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
