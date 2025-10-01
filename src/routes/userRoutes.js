const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// ثبت نام کاربر
router.post('/register', userController.registerUser);

// ثبت سفارش
router.post('/order', userController.placeOrder);

// دریافت اطلاعات کاربر
router.get('/profile/:id', userController.getUserProfile);

// به‌روزرسانی اطلاعات کاربر
router.put('/profile/:id', userController.updateUserProfile);

// حذف کاربر
router.delete('/profile/:id', userController.deleteUser);

module.exports = router;