const multer = require('multer');

// تنظیمات ذخیره‌سازی فایل
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // مسیر ذخیره‌سازی فایل‌ها
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // نام فایل ذخیره‌شده
  }
});

// ایجاد میدل‌ور آپلود
const upload = multer({ storage: storage });

// صادرات میدل‌ور
module.exports = upload;