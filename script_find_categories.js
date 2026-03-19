const fs = require('fs');
const products = require('./data/master_products.json');
const categories = new Set(products.map(p => p.category));
console.log(Array.from(categories));
