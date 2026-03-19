const Navigation = require('../models/Navigation');

// @desc    Get all menus
// @route   GET /api/navigation
exports.getMenus = async (req, res) => {
    try {
        const menus = await Navigation.find({});
        res.json(menus);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get menu by handle
// @route   GET /api/navigation/:handle
exports.getMenuByHandle = async (req, res) => {
    try {
        const menu = await Navigation.findOne({ handle: req.params.handle });
        if (menu) {
            res.json(menu);
        } else {
            // Return empty items instead of 404 for frontend convenience?
            // Or just 404
            res.status(404).json({ message: 'Menu not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create/Update menu
// @route   POST /api/navigation
// @access  Private/Admin
exports.saveMenu = async (req, res) => {
    try {
        const { title, handle, items } = req.body;

        // Upsert
        let menu = await Navigation.findOne({ handle });

        if (menu) {
            menu.title = title || menu.title;
            menu.items = items || menu.items;
            const updatedMenu = await menu.save();
            res.json(updatedMenu);
        } else {
            const newMenu = await Navigation.create({
                title,
                handle,
                items
            });
            res.status(201).json(newMenu);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete menu
// @route   DELETE /api/navigation/:id
// @access  Private/Admin
exports.deleteMenu = async (req, res) => {
    try {
        const menu = await Navigation.findById(req.params.id);
        if (menu) {
            await menu.deleteOne();
            res.json({ message: 'Menu deleted' });
        } else {
            res.status(404).json({ message: 'Menu not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
