// Script to fix the duplicate key error on orders collection
// Run this with: node fix-orders-index.js

const mongoose = require('mongoose');
require('dotenv').config();

async function fixOrdersIndex() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shopiclone');
        console.log('✅ Connected to MongoDB');

        // Get the orders collection
        const db = mongoose.connection.db;
        const ordersCollection = db.collection('orders');

        // List all indexes
        console.log('\n📋 Current indexes on orders collection:');
        const indexes = await ordersCollection.indexes();
        console.log(JSON.stringify(indexes, null, 2));

        // Drop the problematic id_1 index if it exists
        try {
            await ordersCollection.dropIndex('id_1');
            console.log('\n✅ Successfully dropped id_1 index');
        } catch (err) {
            if (err.code === 27) {
                console.log('\n⚠️  Index id_1 does not exist (already dropped or never created)');
            } else {
                throw err;
            }
        }

        // List indexes after dropping
        console.log('\n📋 Indexes after cleanup:');
        const indexesAfter = await ordersCollection.indexes();
        console.log(JSON.stringify(indexesAfter, null, 2));

        console.log('\n✅ Fix complete! You can now create orders without errors.');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixOrdersIndex();
