const express = require('express');
const router = express.Router();
const foodController = require('../controllers/foodController');

// دریافت لیست غذاها
router.get('/', foodController.getAllFoods);

// افزودن غذا
router.post('/', foodController.addFood);

// به‌روزرسانی غذا
router.put('/:id', foodController.updateFood);

// حذف غذا
router.delete('/:id', foodController.deleteFood);

// دریافت جزئیات غذا
router.get('/:id', foodController.getFoodById);

module.exports = router;