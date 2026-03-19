const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images are allowed'));
    }
}).single('image');

// @desc    Upload an image
// @route   POST /api/content/upload
exports.uploadImage = (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const filePath = `/uploads/${req.file.filename}`;
        res.json({
            message: 'Image uploaded successfully',
            filePath,
            fileName: req.file.filename
        });
    });
};

// @desc    Get all uploaded images
// @route   GET /api/content/images
exports.getImages = (req, res) => {
    const uploadDir = 'uploads/';
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return res.json([]);
            }
            return res.status(500).json({ message: 'Failed to list images' });
        }

        const images = files.map(file => ({
            name: file,
            url: `/uploads/${file}`,
            createdAt: fs.statSync(path.join(uploadDir, file)).birthtime
        })).sort((a, b) => b.createdAt - a.createdAt);

        res.json(images);
    });
};

// @desc    Delete an image
// @route   DELETE /api/content/images/:filename
exports.deleteImage = (req, res) => {
    const filePath = path.join('uploads', req.params.filename);

    if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
            if (err) {
                return res.status(500).json({ message: 'Failed to delete image' });
            }
            res.json({ message: 'Image deleted' });
        });
    } else {
        res.status(404).json({ message: 'Image not found' });
    }
};
