const mongoose = require('mongoose');

const navigationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    handle: { // e.g., 'main-menu', 'footer-menu'
        type: String,
        required: true,
        unique: true
    },
    items: [{
        title: String,
        url: String, // e.g., /pages/about or /collections/winter
        type: {
            type: String,
            enum: ['page', 'collection', 'url', 'product'],
            default: 'url'
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Navigation', navigationSchema);
