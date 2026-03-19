const mongoose = require('mongoose');
const AbandonedCheckout = require('./models/AbandonedCheckout');
const Store = require('./models/Store');
const fs = require('fs');
require('dotenv').config();

const debugCheckouts = async () => {
    let output = '';
    const log = (msg) => { output += msg + '\n'; console.log(msg); };

    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shopiclone');
        log('Connected to DB');

        const allCheckouts = await AbandonedCheckout.find({});
        log(`Total Abandoned Checkout Records: ${allCheckouts.length}`);

        for (const c of allCheckouts) {
            log('--- Record ---');
            log(`ID: ${c._id}`);
            log(`Email: ${c.customerEmail}`);
            log(`Status: ${c.status}`);
            log(`Recovery Sent: ${c.recoveryEmailSent}`);
            log(`Recovery Sent At: ${c.recoveryEmailSentAt}`);
            log(`Created At: ${c.createdAt}`);
            log(`Now: ${new Date()}`);
            log(`Difference (mins): ${(new Date() - c.createdAt) / 1000 / 60}`);

            const store = await Store.findById(c.storeId);
            if (store) {
                log('--- Store Settings ---');
                log(`Store Name: ${store.name}`);
                log(`Automation Enabled: ${store.marketingSettings?.abandonedCheckoutEnabled}`);
                log(`SMTP Host: ${store.smtpSettings?.host || 'MISSING'}`);
                log(`From Email: ${store.smtpSettings?.fromEmail || 'MISSING'}`);
                log(`User: ${store.smtpSettings?.user || 'MISSING'}`);
            } else {
                log('--- Store Not Found ---');
            }
        }

        await mongoose.disconnect();
    } catch (err) {
        log(`Error: ${err.message}`);
    } finally {
        fs.writeFileSync('debug_checkouts_log.txt', output);
    }
};

debugCheckouts();
