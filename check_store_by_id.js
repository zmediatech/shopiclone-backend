
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env from CURRENT dir (backend)
dotenv.config({ path: './.env' });

const Store = require('./models/Store');
const User = require('./models/User');

async function check() {
    try {
        if (!process.env.MONGO_URI) {
            console.error('MONGO_URI is not defined in .env');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const storeId = '69ae32f7427593008a3073c7';
        const store = await Store.findById(storeId)
            .populate('ownerId', 'name email')
            .lean();

        if (!store) {
            console.log(`Store with ID ${storeId} NOT FOUND.`);
        } else {
            console.log(`--- Store: ${store.name} (${store._id}) ---`);
            console.log(`Owner: ${store.ownerId?.name} (${store.ownerId?.email})`);
            console.log(`KYC Info:`, JSON.stringify(store.ownerInfo, null, 2));
            console.log(`-----------------------------------\n`);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

check();
