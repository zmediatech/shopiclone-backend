
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: './.env' });

const User = require('./models/User');
const Store = require('./models/Store');

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const email = 'bwd33593@laoia.com';
        const user = await User.findOne({ email }).lean();

        if (!user) {
            console.log(`User with email ${email} NOT FOUND.`);
        } else {
            console.log(`--- User: ${user.name} (${user.email}) ---`);
            console.log(`ID: ${user._id}`);
            console.log(`Role: ${user.role}`);

            const stores = await Store.find({ ownerId: user._id }).lean();
            console.log(`Found ${stores.length} stores owned by this user:`);
            stores.forEach(s => {
                console.log(`- ${s.name} (${s._id}) | KYC: ${s.ownerInfo?.kycStatus || 'N/A'}`);
            });
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

check();
