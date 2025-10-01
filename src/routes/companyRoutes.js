// src/routes/companyRoutes.js
const express = require('express');
const router = express.Router();
const { addCompany, getAllCompanies } = require('../controllers/companyController');
const { protect, admin } = require('../middleware/auth');

router.route('/')
  .post(protect, admin, addCompany)
  .get(protect, admin, getAllCompanies);

module.exports = router;