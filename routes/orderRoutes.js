
const express = require('express');
const router = express.Router();
const { getOrders, createOrder, updateOrderStatus, trackOrder } = require('../controllers/orderController');
const { protect } = require('../middlewares/auth');
const { storeMiddleware } = require('../middlewares/storeMiddleware');

router.get('/', protect, storeMiddleware, getOrders);
router.get('/track/:id', trackOrder);
router.post('/', createOrder); // Public storefront can create orders
router.put('/:id/status', protect, storeMiddleware, updateOrderStatus);

module.exports = router;
