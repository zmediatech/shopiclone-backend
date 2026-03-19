const express = require('express');
const router = express.Router();
const { getMenus, getMenuByHandle, saveMenu, deleteMenu } = require('../controllers/navigationController');
const { protect, admin } = require('../middlewares/auth');

router.route('/')
    .get(getMenus)
    .post(protect, admin, saveMenu);

router.route('/:handle') // Careful, this might conflict if I used :id. But :handle is string, :id is ObjectId.
    .get(getMenuByHandle);

router.route('/id/:id') // Explicit ID route to avoid conflict
    .delete(protect, admin, deleteMenu);

module.exports = router;
