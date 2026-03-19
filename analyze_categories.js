const fs = require('fs');
const products = require('./data/master_products.json');

// Count products per category
const stats = {};
products.forEach(p => {
    const cat = p.category || 'Uncategorized';
    stats[cat] = (stats[cat] || 0) + 1;
});

console.log('Current Category Distribution:');
console.log('================================');
Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
        console.log(`${cat.padEnd(30)} : ${count} products`);
    });

console.log('\n\nSample products from each category:');
console.log('====================================');

const samplesByCategory = {};
products.forEach(p => {
    const cat = p.category || 'Uncategorized';
    if (!samplesByCategory[cat]) {
        samplesByCategory[cat] = [];
    }
    if (samplesByCategory[cat].length < 3) {
        samplesByCategory[cat].push(p.name);
    }
});

Object.entries(samplesByCategory).forEach(([cat, samples]) => {
    console.log(`\n${cat}:`);
    samples.forEach(name => console.log(`  - ${name}`));
});
