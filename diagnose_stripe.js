const mongoose = require('mongoose');
require('dotenv').config();
const Package = require('./models/Package');

async function diagnose() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shopiclone');
        const pkgs = await Package.find();
        console.log(`TOTAL_PACKAGES: ${pkgs.length}`);
        pkgs.forEach(p => {
            console.log(`NAME: ${p.name}, TRIAL: ${p.isTrial}, PKRP: ${p.pricePKR}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
diagnose();
