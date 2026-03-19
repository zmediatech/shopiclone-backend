const express = require('express');
const router = express.Router();
const { getPages, getPageBySlug, createPage, updatePage, deletePage } = require('../controllers/pageController');
const { protect, admin } = require('../middlewares/auth');
const { storeMiddleware } = require('../middlewares/storeMiddleware');

router.route('/')
    .get(protect, storeMiddleware, getPages)
    .post(protect, admin, storeMiddleware, createPage);

router.route('/:slug')
    .get(storeMiddleware, getPageBySlug);

router.route('/:id')
    .put(protect, admin, storeMiddleware, updatePage)
    .delete(protect, admin, storeMiddleware, deletePage);

module.exports = router;
