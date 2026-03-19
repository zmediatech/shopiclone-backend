const Page = require('../models/Page');

const Store = require('../models/Store');

// Helper to get store
const getStore = async (req) => {
    if (req.store) return req.store;
    return await Store.findOne({ ownerId: req.user.id });
};

// @desc    Get all pages
// @route   GET /api/pages
// @access  Private/Admin
exports.getPages = async (req, res) => {
    try {
        const store = await getStore(req);
        if (!store) return res.status(404).json({ message: 'Store not found' });

        const pages = await Page.find({ storeId: store._id }).sort({ createdAt: -1 });
        res.json(pages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get page by slug
// @route   GET /api/pages/:slug
// @access  Public
exports.getPageBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        // In public mode, store ID should come from subdomain/context
        const query = { slug };
        if (req.storeId) {
            query.storeId = req.storeId;
        }

        const page = await Page.findOne(query);
        if (page) {
            res.json(page);
        } else {
            res.status(404).json({ message: 'Page not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a page
// @route   POST /api/pages
// @access  Private/Admin
exports.createPage = async (req, res) => {
    try {
        const store = await getStore(req);
        if (!store) return res.status(404).json({ message: 'Store not found' });

        const { title, content, slug, isPublished } = req.body;

        // Simple slugify if not provided or just clean it
        const pageSlug = slug || title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

        const pageExists = await Page.findOne({ storeId: store._id, slug: pageSlug });
        if (pageExists) {
            return res.status(400).json({ message: 'Page with this slug already exists' });
        }

        const page = await Page.create({
            storeId: store._id,
            title,
            slug: pageSlug,
            content: content || '',
            isPublished: isPublished !== undefined ? isPublished : true
        });

        res.status(201).json(page);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a page
// @route   PUT /api/pages/:id
// @access  Private/Admin
exports.updatePage = async (req, res) => {
    try {
        const store = await getStore(req);
        if (!store) return res.status(404).json({ message: 'Store not found' });

        const page = await Page.findOne({ _id: req.params.id, storeId: store._id });

        if (page) {
            page.title = req.body.title || page.title;
            page.content = req.body.content || page.content;
            page.isPublished = req.body.isPublished !== undefined ? req.body.isPublished : page.isPublished;

            if (req.body.slug && req.body.slug !== page.slug) {
                const slugExists = await Page.findOne({ storeId: store._id, slug: req.body.slug });
                if (slugExists) {
                    return res.status(400).json({ message: 'Slug already in use' });
                }
                page.slug = req.body.slug;
            }

            const updatedPage = await page.save();
            res.json(updatedPage);
        } else {
            res.status(404).json({ message: 'Page not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a page
// @route   DELETE /api/pages/:id
// @access  Private/Admin
exports.deletePage = async (req, res) => {
    try {
        const store = await getStore(req);
        if (!store) return res.status(404).json({ message: 'Store not found' });

        const page = await Page.findOne({ _id: req.params.id, storeId: store._id });

        if (page) {
            await page.deleteOne();
            res.json({ message: 'Page removed' });
        } else {
            res.status(404).json({ message: 'Page not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
