const express = require('express');
const router = express.Router();
const { getCollections, createCollection, deleteCollection } = require('../controllers/collectionController');
const { protect } = require('../middlewares/auth');
const { storeMiddleware } = require('../middlewares/storeMiddleware');

router.use(protect);
router.use(storeMiddleware);

router.route('/')
    .get(protect, getCollections)
    .post(protect, createCollection);

router.route('/:id')
    .delete(protect, deleteCollection);

module.exports = router;
