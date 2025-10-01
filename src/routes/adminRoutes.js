const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// مدیریت غذاها
router.post('/foods', adminController.addFood);
router.get('/foods', adminController.getFoods);
router.put('/foods/:id', adminController.updateFood);
router.delete('/foods/:id', adminController.deleteFood);

// مدیریت کاربران
router.post('/users', adminController.addUser);
router.get('/users', adminController.getUsers);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// تولید گزارشات
router.get('/reports', adminController.generateReports);

module.exports = router;