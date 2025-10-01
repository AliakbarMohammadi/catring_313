const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// ایجاد گزارش جدید
router.post('/create', reportController.createReport);

// دریافت گزارش سفارش‌ها
router.get('/orders', reportController.getOrderReports);

// دریافت گزارش فاکتورها
router.get('/invoices', reportController.getInvoiceReports);

module.exports = router;