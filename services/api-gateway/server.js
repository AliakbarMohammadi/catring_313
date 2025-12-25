import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// بارگذاری متغیرهای محیطی
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// پیکربندی سرویس‌ها
const SERVICES = {
  auth: {
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    healthPath: '/health'
  },
  users: {
    url: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    healthPath: '/health'
  },
  menu: {
    url: process.env.MENU_SERVICE_URL || 'http://localhost:3003',
    healthPath: '/health'
  },
  orders: {
    url: process.env.ORDER_SERVICE_URL || 'http://localhost:3004',
    healthPath: '/health'
  },
  payments: {
    url: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005',
    healthPath: '/health'
  },
  notifications: {
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
    healthPath: '/health'
  },
  reporting: {
    url: process.env.REPORTING_SERVICE_URL || 'http://localhost:3007',
    healthPath: '/health'
  }
};

// میدل‌ویرهای امنیتی و عمومی
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS امن
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// پارس کردن JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// لاگ‌گیری درخواست‌ها
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, { 
    ip: req.ip, 
    userAgent: req.get('User-Agent') 
  });
  next();
});

// محدودیت نرخ کلی
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // ۱۵ دقیقه
  max: 1000, // حداکثر ۱۰۰۰ درخواست در ۱۵ دقیقه
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'تعداد درخواست‌های شما از حد مجاز گذشته است. لطفاً بعداً تلاش کنید.',
      timestamp: new Date().toISOString()
    }
  }
});
app.use(globalRateLimit);

// Health Check برای API Gateway
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API Gateway کار می‌کند!',
    timestamp: new Date().toISOString(),
    services: Object.keys(SERVICES)
  });
});

// Direct auth test endpoint
app.post('/api/auth-test', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required',
        timestamp: new Date().toISOString()
      }
    });
  }

  // Mock successful login
  res.json({
    success: true,
    data: {
      user: {
        id: 'user_123',
        email: email,
        userType: 'individual',
        firstName: 'Test',
        lastName: 'User'
      },
      accessToken: 'mock_access_token_' + Date.now(),
      refreshToken: 'mock_refresh_token_' + Date.now(),
      expiresIn: '24h'
    },
    message: 'ورود موفقیت‌آمیز بود (از طریق API Gateway)'
  });
});

// Health Check برای تمام سرویس‌ها
app.get('/health/services', async (req, res) => {
  const servicesStatus = {};
  
  for (const [serviceName, config] of Object.entries(SERVICES)) {
    try {
      // فعلاً فقط URL را چک می‌کنیم
      servicesStatus[serviceName] = {
        status: 'unknown',
        url: config.url,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      servicesStatus[serviceName] = {
        status: 'error',
        url: config.url,
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }
  
  res.json({
    gateway: 'healthy',
    timestamp: new Date().toISOString(),
    services: servicesStatus
  });
});

// تابع کمکی برای ایجاد پروکسی
const createServiceProxy = (serviceName, pathRewrite) => {
  return createProxyMiddleware({
    target: SERVICES[serviceName].url,
    changeOrigin: true,
    pathRewrite,
    timeout: 30000, // 30 seconds timeout
    proxyTimeout: 30000,
    onProxyReq: (proxyReq, req, res) => {
      console.log(`پروکسی درخواست به ${serviceName}: ${req.method} ${req.path}`);
    },
    onError: (err, req, res) => {
      console.error(`خطا در پروکسی سرویس ${serviceName}:`, err.message);
      
      if (!res.headersSent) {
        res.status(503).json({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: `سرویس ${serviceName} در دسترس نیست`,
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  });
};

// پروکسی برای سرویس احراز هویت
app.use('/api/auth', createServiceProxy('auth', { '^/api/auth': '' }));

// پروکسی برای سرویس مدیریت کاربران
app.use('/api/users', createServiceProxy('users', { '^/api/users': '/users' }));

// پروکسی برای سرویس مدیریت منو
app.use('/api/menu', createServiceProxy('menu', { '^/api/menu': '/menu' }));

// پروکسی برای سرویس مدیریت سفارشات
app.use('/api/orders', createServiceProxy('orders', { '^/api/orders': '/orders' }));

// پروکسی برای سرویس پرداخت
app.use('/api/payments', createServiceProxy('payments', { '^/api/payments': '/payments' }));

// پروکسی برای سرویس اعلان‌رسانی
app.use('/api/notifications', createServiceProxy('notifications', { '^/api/notifications': '/notifications' }));

// پروکسی برای سرویس گزارش‌گیری
app.use('/api/reporting', createServiceProxy('reporting', { '^/api/reporting': '/reporting' }));

// مدیریت مسیرهای نامعتبر
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'مسیر درخواستی یافت نشد',
      path: req.originalUrl,
      timestamp: new Date().toISOString()
    }
  });
});

// مدیریت خطاهای کلی
app.use((error, req, res, next) => {
  console.error('خطای غیرمنتظره در API Gateway:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'خطای داخلی سرور',
      timestamp: new Date().toISOString()
    }
  });
});

// راه‌اندازی سرور
app.listen(PORT, () => {
  console.log(`🚀 API Gateway در حال اجرا روی پورت ${PORT}`);
  console.log('📋 سرویس‌های پیکربندی شده:', Object.keys(SERVICES));
  console.log('🌐 Frontend URL: http://localhost:3000');
});

export default app;