// src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// نگهبان اول: بررسی می‌کند آیا کاربر لاگین کرده است یا نه
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // دریافت توکن از هدر 'Bearer token'
      token = req.headers.authorization.split(' ')[1];

      // اعتبارسنجی توکن
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // پیدا کردن کاربر با ID موجود در توکن و اضافه کردن آن به req
      // ما پسورد را نیاز نداریم پس آن را حذف می‌کنیم
      req.user = await User.findById(decoded.id).select('-password');

      next(); // برو به مرحله بعد
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// نگهبان دوم: بررسی می‌کند آیا نقش کاربر 'admin' است یا نه
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next(); // اگر ادمین بود، برو به مرحله بعد
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' }); // 403 یعنی دسترسی ممنوع
  }
};

module.exports = { protect, admin };