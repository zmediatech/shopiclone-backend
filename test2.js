const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/shopiclone').then(async () => {
    const Product = require('./models/Product');
    const p = await Product.findOne({ 'options.0': { $exists: true } });
    console.log(JSON.stringify(p, null, 2));
    process.exit(0);
}).catch(console.error);
