
const express = require('express');
const router = express.Router();
const { updateProfile, getUserProfile, getCustomers, getCustomerDetails } = require('../controllers/userController');
const { protect, admin } = require('../middlewares/auth');
const { storeMiddleware } = require('../middlewares/storeMiddleware');

router.route('/')
    .get(protect, admin, storeMiddleware, getCustomers);

router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateProfile);

router.get('/customer/:email', protect, admin, storeMiddleware, getCustomerDetails);

module.exports = router;
