const mongoose = require('mongoose');
require('dotenv').config();
const Package = require('./models/Package');
const fs = require('fs');

async function diagnose() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shopiclone');
        const pkg = await Package.findOne({ isTrial: false });
        if (pkg) {
            fs.writeFileSync('pkg_id.txt', pkg._id.toString());
        } else {
            fs.writeFileSync('pkg_id.txt', 'NO_PKG');
        }
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}
diagnose();
