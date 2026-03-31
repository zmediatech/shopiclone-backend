const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Product = require('./models/Product');
const Store = require('./models/Store');

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const storeId = '69c61f43d94592708bf2c8cb';

        console.log('--- Checking Store ---');
        const store = await Store.findById(storeId);
        console.log('Store found:', store ? store.name : 'NO');

        console.log('\n--- Checking Products for Store ---');
        const products = await Product.find({ storeId: new mongoose.Types.ObjectId(storeId) });
        console.log('Total products for store:', products.length);
        products.forEach(p => {
            console.log(`- ID: ${p._id}, Name: ${p.name}, isMaster: ${p.isMaster}`);
        });

        console.log('\n--- Checking Products with isMaster constraint ---');
        const filteredProducts = await Product.find({
            storeId: new mongoose.Types.ObjectId(storeId),
            isMaster: { $ne: true }
        });
        console.log('Filtered products length:', filteredProducts.length);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
