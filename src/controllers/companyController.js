// src/controllers/companyController.js
const Company = require('../models/Company');

// @desc    Add a new company
// @route   POST /api/companies
// @access  Private/Admin
const addCompany = async (req, res) => {
  const { name, address } = req.body;
  try {
    const companyExists = await Company.findOne({ name });
    if (companyExists) {
      return res.status(400).json({ message: 'Company already exists' });
    }
    const company = await Company.create({ name, address });
    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all companies
// @route   GET /api/companies
// @access  Private/Admin
const getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.find({});
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// ... (توابع آپدیت و حذف شرکت را هم می‌توانید مشابه کنترلر غذا اضافه کنید)

module.exports = { addCompany, getAllCompanies };