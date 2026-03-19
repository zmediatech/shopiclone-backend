const express = require('express');
const router = express.Router();
const returnController = require('../controllers/returnController');
const { protect, admin } = require('../middlewares/auth');
const { storeMiddleware } = require('../middlewares/storeMiddleware');

// Create return request (public or customer)
router.post('/', returnController.createReturn);

// Admin routes - protected
router.use(protect);
router.use(admin);
router.use(storeMiddleware);

// Get all returns (admin)
router.get('/', returnController.getAllReturns);

// Get return by ID
router.get('/:id', returnController.getReturnById);

// Get returns by customer email
router.get('/customer/:email', returnController.getReturnsByCustomer);

// Update return status
router.put('/:id/status', returnController.updateReturnStatus);

// Delete return (admin)
router.delete('/:id', returnController.deleteReturn);

module.exports = router;
