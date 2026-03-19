const fs = require('fs');
const products = require('./data/master_products.json');

// Simplified, broader categories with comprehensive keywords
// Priority order matters - more specific categories first
const categoryRules = [
    {
        category: 'Beauty & Personal Care',
        keywords: ['shampoo', 'conditioner', 'soap', 'facewash', 'face wash', 'moisturizer', 'moisturiser', 'cream', 'serum', 'vitamin c', 'vitamin e', 'niacinamide', 'skincare', 'skin care', 'cosmetic', 'makeup', 'foundation', 'lipstick', 'nail', 'perfume', 'lotion', 'gel', 'mask', 'pimple', 'exfoliating', 'hair oil', 'body wash', 'scrub', 'gloves moroccan', 'beauty', 'glow', 'bright', 'flawless', 'anti-hairfall', 'anti hairfall', 'dandruff', 'trimmer', 'clipper', 'shaver', 'razor', 'barber', 'hair cutting', 'grooming', 't9', 'vintage', 'heel pad', 'pain relief']
    },
    {
        category: 'Electronics & Accessories',
        keywords: ['airpods', 'earbuds', 'headphone', 'earphone', 'handfree', 'hands free', 'tws', 'bluetooth', 'wireless', 'charger', 'charging', 'cable', 'usb', 'type c', 'adapter', 'power bank', 'battery', 'phone holder', 'mobile', 'iphone', 'samsung', 'xiaomi', 'huawei', 'lcd', 'digital display', 'electronic', 'phone case', 'iphone case', 'magsafe', 'magnetic case', 'phone cover', 'screen protector', 'cable organizer', 'wire winder', 'cable management', 'cord', 'car charger', 'cigarette lighter']
    },
    {
        category: 'Home & Kitchen',
        keywords: ['storage bag', 'storage box', 'organizer', 'wardrobe', 'closet', 'drawer', 'basket', 'holder', 'hanger', 'wall mount', 'wall sticker', 'wallpaper', 'decor', 'decoration', 'blanket', 'pillow', 'curtain', 'furniture', 'remote holder', 'key holder', 'bamboo', 'foldable', 'portable', 'lamp', 'light', 'led', 'projector lamp', 'night light', 'starry', 'dishwash', 'dish wash', 'kitchen', 'cooking', 'food thermometer', 'utensil', 'pot', 'pan', 'lemon max']
    },
    {
        category: 'Fashion & Clothing',
        keywords: ['shirt', 'jeans', 'clothes', 'dress', 'pants', 'jacket', 'coat', 'underwear', 'socks', 'fashion', 'apparel', 'clothing']
    },
    {
        category: 'Automotive',
        keywords: ['car wiper', 'vehicle', 'automobile', 'car', 'auto']
    },
    {
        category: 'Office & School',
        keywords: ['writing tablet', 'slate', 'e-writer', 'memo pad', 'notebook', 'pen', 'pencil', 'paper', 'desk', 'office', 'school', 'stationery']
    },
    {
        category: 'Sports & Toys',
        keywords: ['sports', 'fitness', 'yoga', 'gym', 'exercise', 'workout', 'toy', 'kids', 'children', 'baby', 'doll', 'puzzle', 'game']
    },
    {
        category: 'Tools & Hardware',
        keywords: ['tool', 'battery tester', 'thermometer', 'repair', 'hardware', 'tester']
    }
];

function categorizeProduct(productName) {
    const nameLower = productName.toLowerCase();

    // Check each category in priority order
    for (const rule of categoryRules) {
        for (const keyword of rule.keywords) {
            if (nameLower.includes(keyword)) {
                return rule.category;
            }
        }
    }

    return 'Other';
}

// Categorize all products
const categorizedProducts = products.map(product => ({
    ...product,
    category: categorizeProduct(product.name)
}));

// Write back to file
fs.writeFileSync(
    './data/master_products.json',
    JSON.stringify(categorizedProducts, null, 2),
    'utf8'
);

// Show statistics
const stats = {};
categorizedProducts.forEach(p => {
    stats[p.category] = (stats[p.category] || 0) + 1;
});

console.log('✅ Categorization complete with simplified categories!');
console.log('\n📊 Category distribution:');
Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
        const percentage = ((count / categorizedProducts.length) * 100).toFixed(1);
        console.log(`  ${cat.padEnd(30)} : ${count.toString().padStart(3)} products (${percentage}%)`);
    });
console.log(`\n📦 Total: ${categorizedProducts.length} products`);

// Show sample products from each category
console.log('\n\n📝 Sample products per category:');
console.log('================================');
const samplesByCategory = {};
categorizedProducts.forEach(p => {
    const cat = p.category;
    if (!samplesByCategory[cat]) {
        samplesByCategory[cat] = [];
    }
    if (samplesByCategory[cat].length < 3) {
        samplesByCategory[cat].push(p.name);
    }
});

Object.entries(samplesByCategory)
    .sort((a, b) => (stats[b[0]] || 0) - (stats[a[0]] || 0))
    .forEach(([cat, samples]) => {
        console.log(`\n${cat}:`);
        samples.forEach(name => console.log(`  - ${name.substring(0, 80)}`));
    });
