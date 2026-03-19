
const mongoose = require('mongoose');
const AbandonedCheckout = require('./models/AbandonedCheckout');
require('dotenv').config();

const resetCheckouts = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shopiclone');
        console.log('Connected to DB');

        const result = await AbandonedCheckout.updateMany(
            {},
            {
                $set: {
                    status: 'pending',
                    recoveryEmailSent: false,
                    createdAt: new Date() // Set to NOW so it triggers after 2 mins from now
                }
            }
        );
        console.log(`Reset ${result.modifiedCount} records. They will be processed in 2 minutes.`);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

resetCheckouts();
