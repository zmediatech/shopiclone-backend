const express = require('express');
const router = express.Router();
const { getDiscounts, createDiscount, deleteDiscount, validateDiscount, getAutomaticDiscount } = require('../controllers/discountController');
const { protect } = require('../middlewares/auth');

// Public route for customer site
router.post('/validate', validateDiscount);
router.get('/automatic/:storeId', getAutomaticDiscount);

// Protected admin routes
router.use(protect);

router.route('/')
    .get(getDiscounts)
    .post(createDiscount);

router.route('/:id')
    .delete(deleteDiscount);

module.exports = router;
