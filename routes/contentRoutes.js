const express = require('express');
const router = express.Router();
const { uploadImage, getImages, deleteImage } = require('../controllers/contentController');
const { protect, admin } = require('../middlewares/auth');

router.route('/upload')
    .post(protect, admin, uploadImage);

router.route('/images')
    .get(getImages);

router.route('/images/:filename')
    .delete(protect, admin, deleteImage);

module.exports = router;
