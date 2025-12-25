# Shared Package - تدبیرخوان

پکیج مشترک سیستم تدبیرخوان شامل ابزارها، مدل‌ها، و پیکربندی‌های مشترک بین تمام سرویس‌ها.

## 📁 ساختار

```
shared/
├── config/           # پیکربندی‌های سیستم
├── docs/            # مستندات
├── middleware/      # Middleware های مشترک
├── migrations/      # Migration های دیتابیس
├── models/          # مدل‌های Sequelize
├── scripts/         # اسکریپت‌های مدیریتی
├── test-helpers/    # ابزارهای کمکی تست
├── tests/           # تست‌های مشترک
├── types/           # تعریف Type ها
└── utils/           # ابزارهای کمکی
```

## 🚀 نصب و راه‌اندازی

### پیش‌نیازها
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### نصب وابستگی‌ها
```bash
npm install
```

### راه‌اندازی دیتابیس
```bash
# اجرای Migration ها
npm run migrate:up

# درج داده‌های نمونه
npm run seed

# یا راه‌اندازی کامل
npm run db:setup
```

## 🗄️ مدیریت دیتابیس

### Migration ها
```bash
# اجرای Migration ها
npm run migrate:up

# بازگردانی Migration
npm run migrate:down

# وضعیت Migration ها
npm run migrate:status

# ریست کامل (خطرناک!)
npm run migrate:reset
```

### Seeding
```bash
# داده‌های Development
npm run seed

# داده‌های Test
npm run seed:test

# پاک کردن داده‌ها
npm run seed:clear

# ریست و درج مجدد
npm run seed:reset
```

## 🧪 تست‌ها

### تست مدل‌ها
```bash
# تست کامل مدل‌ها
npm run test:models

# تست سیستم
npm run test:system

# تست‌های Jest
npm test

# تست با coverage
npm run test:coverage
```

### تست سیستم
```bash
# تست کلی سیستم
npm run system:test

# راه‌اندازی و تست
npm run system:setup
```

## 📊 مدل‌های دیتابیس

### مدل‌های اصلی
- **User**: مدیریت کاربران
- **Company**: مدیریت شرکت‌ها
- **Employee**: ارتباط کاربران با شرکت‌ها
- **FoodCategory**: دسته‌بندی غذاها
- **FoodItem**: اقلام غذایی
- **DailyMenu**: منوهای روزانه
- **MenuItem**: آیتم‌های منوی روزانه
- **Order**: سفارشات
- **OrderItem**: آیتم‌های سفارش
- **Payment**: پرداخت‌ها
- **Invoice**: فاکتورها
- **Notification**: اعلان‌ها
- **NotificationPreference**: تنظیمات اعلان
- **AuditLog**: لاگ‌های حسابرسی
- **SecurityEvent**: رویدادهای امنیتی

### استفاده از مدل‌ها
```javascript
import { User, Company, Order } from '@tadbir-khowan/shared/models';

// ایجاد کاربر جدید
const user = await User.create({
  email: 'user@example.com',
  first_name: 'نام',
  last_name: 'نام خانوادگی',
  user_type: 'individual_user'
});

// جستجوی سفارشات
const orders = await Order.search({
  user_id: user.id,
  status: 'confirmed',
  limit: 10
});
```

## 🔧 ابزارهای کمکی

### Logger
```javascript
import { createLogger } from '@tadbir-khowan/shared/utils/logger';

const logger = createLogger('service-name');
logger.info('پیام اطلاعاتی');
logger.error('پیام خطا', { error: error.message });
```

### Connection Pool
```javascript
import connectionPool from '@tadbir-khowan/shared/utils/connectionPool';

// راه‌اندازی
await connectionPool.initialize();

// اجرای تراکنش
const result = await connectionPool.executeTransaction(async (transaction) => {
  // عملیات دیتابیس
});

// عملیات Redis
await connectionPool.executeRedisOperation(async (redis) => {
  await redis.set('key', 'value');
});
```

### Encryption
```javascript
import { encrypt, decrypt } from '@tadbir-khowan/shared/utils/encryption';

// رمزنگاری
const encrypted = encrypt('متن حساس');

// رمزگشایی
const decrypted = decrypt(encrypted);
```

### Validation
```javascript
import { validateEmail, validatePhone } from '@tadbir-khowan/shared/utils/validation';

const isValidEmail = validateEmail('user@example.com');
const isValidPhone = validatePhone('09121234567');
```

## 🔒 امنیت

### Middleware های امنیتی
```javascript
import { 
  authMiddleware, 
  rateLimitMiddleware, 
  securityMiddleware 
} from '@tadbir-khowan/shared/middleware/security';

// استفاده در Express
app.use(securityMiddleware);
app.use('/api', rateLimitMiddleware);
app.use('/api/protected', authMiddleware);
```

### Audit Logging
```javascript
import { auditLogger } from '@tadbir-khowan/shared/utils/auditLogger';

// ثبت عملیات
await auditLogger.log({
  userId: user.id,
  action: 'create',
  resourceType: 'Order',
  resourceId: order.id,
  ipAddress: req.ip,
  userAgent: req.get('User-Agent')
});
```

## 📈 Monitoring

### Health Check
```javascript
import connectionPool from '@tadbir-khowan/shared/utils/connectionPool';

// بررسی سلامت سیستم
const health = await connectionPool.performHealthCheck();
console.log('Database:', health.postgres ? '✅' : '❌');
console.log('Redis:', health.redis ? '✅' : '❌');
```

### آمار Connection Pool
```javascript
const stats = connectionPool.getPoolStats();
console.log('PostgreSQL Connections:', stats.postgres);
console.log('Redis Status:', stats.redis.status);
```

## 🌍 متغیرهای محیطی

### دیتابیس
```env
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tadbir_khowan_dev
DB_USERNAME=postgres
DB_PASSWORD=password
DB_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### امنیت
```env
# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Encryption
ENCRYPTION_KEY=your-32-char-encryption-key
```

### Logging
```env
# Log Level
LOG_LEVEL=info

# Log Directory
LOG_DIR=./logs
```

## 📚 مستندات

- [Database Layer](./docs/DATABASE.md) - مستندات کامل دیتابیس
- [Security](./docs/SECURITY.md) - راهنمای امنیت
- [API Documentation](./docs/API.md) - مستندات API

## 🤝 مشارکت

### قوانین کدنویسی
- استفاده از ESLint و Prettier
- نوشتن تست برای کدهای جدید
- مستندسازی توابع و کلاس‌ها
- استفاده از زبان فارسی در کامنت‌ها

### فرآیند توسعه
1. Fork کردن پروژه
2. ایجاد branch جدید
3. پیاده‌سازی تغییرات
4. نوشتن تست
5. اجرای تست‌ها
6. ارسال Pull Request

## 📄 مجوز

این پروژه تحت مجوز MIT منتشر شده است.

## 🆘 پشتیبانی

برای گزارش مشکلات یا درخواست ویژگی جدید، لطفاً از بخش Issues استفاده کنید.

---

**تیم توسعه تدبیرخوان** 🍽️