const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');

// ایجاد حساب کاربری شرکت
router.post('/create', companyController.createCompany);

// دریافت لیست شرکت‌ها
router.get('/', companyController.getCompanies);

// دریافت اطلاعات شرکت بر اساس شناسه
router.get('/:id', companyController.getCompanyById);

// به‌روزرسانی اطلاعات شرکت
router.put('/:id', companyController.updateCompany);

// حذف حساب کاربری شرکت
router.delete('/:id', companyController.deleteCompany);

module.exports = router;