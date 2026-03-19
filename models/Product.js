
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Store'
    },
    darazId: {
        type: String,
        allowNull: true,
    },
    isMaster: {
        type: Boolean,
        default: false,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    image: {
        type: String,
    },
    images: {
        type: [String],
        default: []
    },
    description: {
        type: String,
    },
    category: {
        type: String,
    },
    inventory: {
        type: Number,
        default: 100
    },
    soldText: {
        type: String,
    },
    soldCount: {
        type: Number,
        default: 0
    },
    sku: {
        type: String
    },
    options: {
        type: [{
            name: String,
            values: [String]
        }],
        default: []
    },
    variants: {
        type: [{
            options: {
                type: Map,
                of: String
            },
            price: Number,
            inventory: {
                type: Number,
                default: 0
            },
            sku: String,
            image: String
        }],
        default: []
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for ID
productSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
