const express = require('express');
const router = express.Router();
const appController = require('../controllers/appController');
const { protect } = require('../middlewares/auth');

// All app routes require authentication
router.use(protect);

router.get('/', appController.getInstalledApps);
router.post('/install', appController.installApp);
router.delete('/:appId', appController.uninstallApp);

module.exports = router;
