const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Store'
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    image: {
        type: String
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    status: {
        type: String,
        enum: ['Active', 'Draft', 'Archived'],
        default: 'Active'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

const Collection = mongoose.model('Collection', collectionSchema);

module.exports = Collection;
