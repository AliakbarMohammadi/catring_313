import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { errorHandler, createLogger } from '@tadbir-khowan/shared';
import { initializeDatabase } from './config/database.js';
import salesRoutes from './routes/sales.js';
import dashboardRoutes from './routes/dashboard.js';
import analyticsRoutes from './routes/analytics.js';
import managerRoutes from './routes/manager.js';

dotenv.config();

const logger = createLogger('reporting-service');

const app = express();
const PORT = process.env.PORT || 3008;

// میدل‌ویر امنیتی
app.use(helmet());
app.use(cors());

// محدودیت نرخ درخواست
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // ۱۵ دقیقه
  max: 100, // حداکثر ۱۰۰ درخواست در هر بازه زمانی
  message: 'درخواست‌های زیادی از این IP ارسال شده، لطفاً بعداً تلاش کنید.',
});
app.use(limiter);

// میدل‌ویر پردازش بدنه درخواست
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// میدل‌ویر لاگ‌گیری
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { 
    ip: req.ip, 
    userAgent: req.get('User-Agent') 
  });
  next();
});

// نقطه بررسی سلامت سرویس
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'reporting-service', 
    timestamp: new Date().toISOString() 
  });
});

// مسیرها
app.use('/sales', salesRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/manager', managerRoutes);

// میدل‌ویر مدیریت خطا
app.use(errorHandler);

// مدیریت ۴۰۴
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'نقطه پایانی یافت نشد',
      timestamp: new Date().toISOString(),
    }
  });
});

app.listen(PORT, async () => {
  logger.info(`سرویس گزارش‌گیری روی پورت ${PORT} در حال اجرا است`);
  
  // راه‌اندازی اتصال پایگاه داده
  const dbInitialized = await initializeDatabase();
  if (dbInitialized) {
    logger.info('پایگاه داده با موفقیت راه‌اندازی شد');
  } else {
    logger.error('راه‌اندازی پایگاه داده ناموفق بود');
  }
});

export default app;