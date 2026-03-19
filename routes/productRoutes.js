
const express = require('express');
const router = express.Router();
const { getProducts, createProduct, deleteProduct, updateProduct, getMasterProducts } = require('../controllers/productController');
const { protect } = require('../middlewares/auth');
const { storeMiddleware } = require('../middlewares/storeMiddleware');

// Public routes
router.use(storeMiddleware); // Apply store context to all
router.get('/master', getMasterProducts);
router.get('/', getProducts);

// Protected routes
router.use(protect);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
