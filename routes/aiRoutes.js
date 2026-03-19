
const express = require('express');
const router = express.Router();
const { generateMarketingCopy, generateProductImage } = require('../controllers/aiController');
const { protect } = require('../middlewares/auth');

// Protect all AI routes (optional - remove if you want public access)
router.use(protect);

// Generate AI marketing copy
router.post('/generate-copy', generateMarketingCopy);

// Generate product image URL
router.post('/generate-image', generateProductImage);

module.exports = router;
