
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect } = require('../middlewares/auth');
const { storeMiddleware } = require('../middlewares/storeMiddleware');

router.get('/summary', protect, storeMiddleware, analyticsController.getAnalyticsSummary);
router.get('/sales-over-time', protect, storeMiddleware, analyticsController.getSalesOverTime);
router.get('/sales-hourly', protect, storeMiddleware, analyticsController.getSalesHourly);
router.get('/top-products', protect, storeMiddleware, analyticsController.getTopProducts);
router.get('/demographics', protect, storeMiddleware, analyticsController.getDemographics);
router.post('/track', analyticsController.trackVisit); // No protect needed for public tracking

module.exports = router;
