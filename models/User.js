
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        match: [/.+\@.+\..+/, 'Please fill a valid email address']
    },
    password: {
        type: String,
        required: function () {
            // Password is only required for local auth (not OAuth)
            return this.provider === 'local';
        }
    },
    provider: {
        type: String,
        enum: ['local', 'google', 'facebook'],
        default: 'local'
    },
    googleId: {
        type: String,
        sparse: true  // Allows multiple null values
    },
    facebookId: {
        type: String,
        sparse: true
    },
    role: {
        type: String,
        enum: ['admin', 'customer', 'superadmin'],
        default: 'admin'
    },
    address: { type: String },
    city: { type: String },
    zip: { type: String },
    country: { type: String },
    phone: { type: String },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationCode: String,
    verificationCodeExpires: Date,
    resetPasswordCode: String,
    resetPasswordExpires: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for ID
userSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

// Hash password before saving (only for local auth)
userSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to match password
userSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password) return false;  // OAuth users don't have passwords
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
