// controllers/UserController.js
const User = require('../models/User');
const Company = require('../models/Company'); // فرض می‌کنیم این مدل وجود دارد
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @access  Public
const registerUser = async (req, res) => {
  const { fullName, nationalId, phoneNumber, password, role, companyId } = req.body;

  try {
    const userExists = await User.findOne({ $or: [{ nationalId }, { phoneNumber }] });

    if (userExists) {
      return res.status(400).json({ message: 'کاربر با این کد ملی یا شماره موبایل قبلا ثبت نام کرده است' });
    }

    // اگر نقش کارمند یا شرکت بود، باید شناسه شرکت معتبر باشد
    if ((role === 'employee' || role === 'company') && companyId) {
        const company = await Company.findById(companyId);
        if (!company) {
            return res.status(400).json({ message: 'شرکت مشخص شده یافت نشد' });
        }
    } else if (role !== 'admin') {
        return res.status(400).json({ message: 'برای این نقش، شناسه شرکت الزامی است' });
    }

    const user = await User.create({
      fullName,
      nationalId,
      phoneNumber,
      password,
      role,
      company: companyId, // برای ادمین این مقدار null خواهد بود
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        fullName: user.fullName,
        nationalId: user.nationalId,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(400).json({ message: 'اطلاعات کاربر نامعتبر است' });
    }
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور', error: error.message });
  }
};

// @desc    Auth user & get token (Login)
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  const { nationalId, password } = req.body;

  try {
    const user = await User.findOne({ nationalId });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        fullName: user.fullName,
        nationalId: user.nationalId,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(401).json({ message: 'کد ملی یا رمز عبور اشتباه است' });
    }
  } catch (error) {
    res.status(500).json({ message: 'خطای سرور', error: error.message });
  }
};

module.exports = { registerUser, loginUser };