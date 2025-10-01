// src/routes/foodRoutes.js
const express = require('express');
const router = express.Router();
const { addFood, updateFood, deleteFood, getAllFoods } = require('../controllers/foodController');
const { protect, admin } = require('../middleware/auth');

// مسیرها
router.route('/')
  .post(protect, admin, addFood) // فقط ادمین لاگین کرده می‌تواند غذا اضافه کند
  .get(protect, getAllFoods);    // هر کاربر لاگین کرده می‌تواند لیست غذاها را ببیند

router.route('/:id')
  .put(protect, admin, updateFood)     // فقط ادمین برای ویرایش
  .delete(protect, admin, deleteFood); // فقط ادمین برای حذف

module.exports = router;