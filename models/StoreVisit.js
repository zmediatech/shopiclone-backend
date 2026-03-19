
const mongoose = require('mongoose');

const storeVisitSchema = new mongoose.Schema({
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true
    },
    ip: String,
    device: {
        type: String,
        enum: ['mobile', 'desktop', 'tablet', 'unknown'],
        default: 'unknown'
    },
    location: {
        city: String,
        country: String
    },
    path: String,
    referrer: String
}, { timestamps: true });

module.exports = mongoose.model('StoreVisit', storeVisitSchema);
