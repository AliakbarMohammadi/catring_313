// src/routes/userRoutes.js - نسخه اصلاح شده و صحیح
const express = require('express');
const router = express.Router();

// 1. ایمپورت صحیح کنترلرها از فایل کنترلر
// نکته: نام فایل شما 'userController.js' با حرف کوچک است، پس آن را رعایت می‌کنیم
const { registerUser, loginUser } = require('../controllers/userController');

// 2. تعریف روت‌ها فقط برای وظایف فعلی (ثبت‌نام و ورود)
router.post('/register', registerUser);
router.post('/login', loginUser);

// ما بعداً در مراحل بعدی، روت‌های دیگر را اضافه خواهیم کرد.
// router.post('/order', ...);
// router.get('/profile/:id', ...);
// router.put('/profile/:id', ...);
// router.delete('/profile/:id', ...);

module.exports = router;