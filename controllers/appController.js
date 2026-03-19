const App = require('../models/App');
const Store = require('../models/Store');

exports.getInstalledApps = async (req, res) => {
    try {
        const store = req.store || await Store.findOne({ ownerId: req.user.id });
        if (!store) return res.status(404).json({ message: 'Store not found' });

        const apps = await App.find({ storeId: store._id });
        res.json(apps);
    } catch (error) {
        console.error('SERVER ERROR - getInstalledApps:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.installApp = async (req, res) => {
    try {
        const { appId, name, config } = req.body;
        const store = req.store || await Store.findOne({ ownerId: req.user.id });
        if (!store) return res.status(404).json({ message: 'Store not found' });

        // Check if already installed
        const existing = await App.findOne({ appId, storeId: store._id });
        if (existing) {
            return res.status(400).json({ message: 'App already installed' });
        }

        const newApp = new App({
            appId,
            name,
            storeId: store._id,
            config: config || {}
        });

        await newApp.save();
        res.status(201).json(newApp);
    } catch (error) {
        console.error('SERVER ERROR - installApp:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.uninstallApp = async (req, res) => {
    try {
        const { appId } = req.params;
        const store = req.store || await Store.findOne({ ownerId: req.user.id });
        if (!store) return res.status(404).json({ message: 'Store not found' });

        await App.findOneAndDelete({ appId, storeId: store._id });
        res.json({ message: 'App uninstalled successfully' });
    } catch (error) {
        console.error('SERVER ERROR - uninstallApp:', error);
        res.status(500).json({ message: error.message });
    }
};
