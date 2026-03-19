
const express = require('express');
const router = express.Router();
const { getStore, updateStore, getStoreByDomain, getAllStores, createStore, deleteStore, testSMTP, updateKycInfo } = require('../controllers/storeController');
const { protect } = require('../middlewares/auth');
const { storeMiddleware } = require('../middlewares/storeMiddleware');

// Public route
router.get('/domain/:domain', getStoreByDomain);

// Protected routes
router.use(protect); // All below are protected
router.use(storeMiddleware); // Parse store context

router.route('/') // Root of /api/store
    .get(getAllStores) // Get all listing
    .post(createStore); // Create new

router.route('/me') // Current store context
    .get(getStore)
    .post(updateStore); // Legacy update path using POST often used in frontend

router.route('/update')
    .post(updateStore); // Public

router.route('/kyc')
    .put(updateKycInfo);

router.route('/:id')
    .delete(deleteStore);

router.post('/test-smtp', testSMTP);

module.exports = router;
