
const Product = require('../models/Product');
const Store = require('../models/Store');
// const masterProducts = require('../data/master_products.json'); // Deprecated: Moved to DB

exports.getMasterProducts = async (req, res) => {
    try {
        let { page = 1, limit = 15, search = '', sort = 'newest', category = 'All' } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        const query = { isMaster: true };

        // Search
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Category Filter
        if (category && category !== 'All') {
            query.category = category;
        }

        // Sorting
        let sortOptions = {};
        switch (sort) {
            case 'newest': sortOptions = { createdAt: -1 }; break;
            case 'oldest': sortOptions = { createdAt: 1 }; break;
            case 'price-asc': sortOptions = { price: 1 }; break;
            case 'price-desc': sortOptions = { price: -1 }; break;
            case 'name-asc': sortOptions = { name: 1 }; break;
            case 'name-desc': sortOptions = { name: -1 }; break;
            case 'sold-desc': sortOptions = { soldCount: -1 }; break;
            case 'sold-asc': sortOptions = { soldCount: 1 }; break;
            default: sortOptions = { createdAt: -1 };
        }

        const total = await Product.countDocuments(query);
        const totalPages = Math.ceil(total / limit);
        const skip = (page - 1) * limit;

        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit);

        res.json({
            products,
            total,
            page,
            pages: totalPages
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getProducts = async (req, res) => {
    try {
        // Use Store Context (from header) or Fallback to Owner's First Store
        let store = req.store;

        if (!store && req.user) {
            store = await Store.findOne({ ownerId: req.user.id });
        }

        if (!store) return res.status(404).json({ message: 'Store not found or context missing' });

        // Build search query
        const searchQuery = { storeId: store._id, isMaster: { $ne: true } };

        // Add search filters if provided
        if (req.query.search) {
            const searchTerm = req.query.search;
            searchQuery.$or = [
                { name: { $regex: searchTerm, $options: 'i' } },
                { sku: { $regex: searchTerm, $options: 'i' } },
                { category: { $regex: searchTerm, $options: 'i' } }
            ];
        }

        const products = await Product.find(searchQuery);
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const isMaster = req.body.isMaster === true;
        const isSuperAdmin = req.user.role === 'super_admin';

        // Use Store Context (from header) or Fallback to Owner's First Store
        let store = req.store || await Store.findOne({ ownerId: req.user.id }).populate('subscription.packageId');

        // If Super Admin is creating a Master product and has no store, use ANY store to satisfy DB required field
        if (!store && isMaster && isSuperAdmin) {
            store = await Store.findOne();
        }

        if (!store) return res.status(404).json({ message: 'Store not found' });

        // Check product limit - Only for standard products (Master products are unlimited)
        if (!isMaster) {
            const productCount = await Product.countDocuments({ storeId: store._id, isMaster: { $ne: true } });
            const pkg = store.subscription?.packageId;

            // If package exists and has a limit, enforce it
            if (pkg && pkg.productLimit && productCount >= pkg.productLimit) {
                return res.status(403).json({
                    message: `Product limit reached (${pkg.productLimit}) for your current plan (${pkg.name || 'Active'}). Please upgrade to add more products.`
                });
            }
        }

        const product = await Product.create({
            ...req.body,
            storeId: store._id
        });
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        await product.deleteOne();
        res.json({ message: 'Product removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
