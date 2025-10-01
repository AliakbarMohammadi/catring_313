// models/UserModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  nationalId: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'company', 'employee'],
    required: true,
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: function () {
      return this.role === 'employee' || this.role === 'company';
    },
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Middleware: هش کردن پسورد قبل از ذخیره شدن کاربر
userSchema.pre('save', async function (next) {
  // فقط در صورتی که پسورد تغییر کرده باشد آن را هش کن
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method: مقایسه پسورد وارد شده با پسورد هش شده در دیتابیس
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);