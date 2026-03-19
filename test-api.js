const API_URL = 'http://localhost:5000/api';

const tests = [
    { name: 'Root Packages', url: '/packages' },
    { name: 'Super Admin Packages', url: '/superadmin/packages' },
    { name: 'Super Admin Stores', url: '/superadmin/stores' }
];

async function runTests() {
    for (const test of tests) {
        console.log(`\n--- Testing: ${test.name} (${test.url}) ---`);
        try {
            const res = await fetch(`${API_URL}${test.url}`);
            console.log('STATUS:', res.status);
            const body = await res.text();
            console.log('BODY:', body.substring(0, 100));
        } catch (err) {
            console.error('ERROR:', err.message);
        }
    }
}

runTests();
