const nodemailer = require('nodemailer');

async function testConnection(port, secure) {
    console.log(`Testing connection on port ${port} (secure: ${secure})...`);
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: port,
        secure: secure,
        auth: {
            user: 'antigravity306@gmail.com',
            pass: 'smqj kxbe sypo clmc' // I don't know the pass, but I'll use a dummy one just to test connection
        },
        connectionTimeout: 5000 // 5 seconds timeout
    });

    try {
        await transporter.verify();
        console.log(`✅ Connection to port ${port} successful!`);
    } catch (error) {
        if (error.code === 'ETIMEDOUT') {
            console.log(`❌ Connection to port ${port} timed out.`);
        } else if (error.code === 'EAUTH') {
            console.log(`✅ Connection to port ${port} established, but authentication failed (which is expected with a dummy password).`);
        } else {
            console.log(`❌ Connection to port ${port} failed with error: ${error.message}`);
        }
    }
}

async function run() {
    await testConnection(587, false);
    await testConnection(465, true);
}

run();
