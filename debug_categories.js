const mongoose = require('mongoose');
const Product = require('./models/Product');
const fs = require('fs');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shopiclone');
        console.log('Connected to DB. Aggregating categories...');

        const categoryCounts = await Product.aggregate([
            { $match: { isMaster: true } },
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        fs.writeFileSync('debug_output.json', JSON.stringify(categoryCounts, null, 2));
        console.log('Output written to debug_output.json');

        const totalMaster = await Product.countDocuments({ isMaster: true });
        console.log('Total Master Products:', totalMaster);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
