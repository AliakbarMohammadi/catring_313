const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// ثبت سفارش جدید
router.post('/orders', orderController.createOrder);

// دریافت لیست سفارشات
router.get('/orders', orderController.getAllOrders);

// دریافت جزئیات یک سفارش خاص
router.get('/orders/:id', orderController.getOrderById);

// به‌روزرسانی سفارش
router.put('/orders/:id', orderController.updateOrder);

// حذف سفارش
router.delete('/orders/:id', orderController.deleteOrder);

module.exports = router;