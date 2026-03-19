const mongoose = require('mongoose');
require('dotenv').config();

let cachedDb = null;

const connectDB = async () => {
    if (cachedDb && mongoose.connection.readyState === 1) {
        console.log('📦 Using cached database connection');
        return cachedDb;
    }

    if (mongoose.connection.readyState === 2) {
        console.log('⏳ Database connection in progress, waiting...');
        await new Promise(resolve => mongoose.connection.once('connected', resolve));
        return mongoose.connection;
    }

    console.log('🆕 Creating new database connection...');

    mongoose.set('bufferCommands', false);
    mongoose.set('autoIndex', false);

    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://anisinbox10_db_user:TPARxjWKVnQJq87U@cluster0.eqaopyk.mongodb.net/?appName=Cluster0', {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4,
            maxPoolSize: 10,
            minPoolSize: 1
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        cachedDb = conn.connection;
        return cachedDb;
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error);
        throw error;
    }
};

mongoose.connection.on('connected', () => console.log('🟢 MongoDB connected'));
mongoose.connection.on('error', (err) => console.error('🔴 MongoDB connection error:', err));
mongoose.connection.on('disconnected', () => {
    console.log('🟡 MongoDB disconnected');
    cachedDb = null;
});

process.on('SIGINT', async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
        console.log('🔴 MongoDB connection closed through app termination');
    }
    process.exit(0);
});

module.exports = { connectDB };