# راهنمای امنیت سیستم تدبیرخوان

## مقدمه

این سند راهنمای جامع امنیت سیستم تدبیرخوان است که شامل تمام جنبه‌های امنیتی، رمزنگاری، حسابرسی و نظارت می‌باشد.

## ویژگی‌های امنیتی

### 1. رمزنگاری داده‌ها (Data Encryption)

#### رمزنگاری داده‌های حساس
- **الگوریتم**: AES-256-GCM
- **کلید**: 256 بیت (32 بایت)
- **IV**: 128 بیت (16 بایت) - تصادفی برای هر رمزنگاری
- **Tag**: 128 بیت (16 بایت) - برای تأیید یکپارچگی

#### رمزنگاری رمز عبور
- **الگوریتم**: bcrypt
- **Salt Rounds**: 12 (قابل تنظیم)
- **حداقل طول**: 8 کاراکتر
- **الزامات**: حروف بزرگ، کوچک، عدد

#### استفاده از سرویس رمزنگاری

```javascript
import { encryptionService } from '@tadbir-khowan/shared';

// رمزنگاری داده حساس
const encryptedData = encryptionService.encrypt('sensitive-data');

// رمزگشایی
const decryptedData = encryptionService.decrypt(encryptedData);

// هش رمز عبور
const hashedPassword = await encryptionService.hashPassword('user-password');

// تأیید رمز عبور
const isValid = await encryptionService.verifyPassword('user-password', hashedPassword);
```

### 2. احراز هویت و مجوزدهی (Authentication & Authorization)

#### JWT Token
- **الگوریتم**: HS256
- **مدت اعتبار**: 24 ساعت (قابل تنظیم)
- **Issuer**: tadbir-khowan
- **Audience**: tadbir-khowan-users

#### نقش‌های کاربری
- `individual`: کاربر عادی
- `employee`: کارمند شرکت
- `company_admin`: مدیر شرکت
- `catering_manager`: مدیر کترینگ

#### استفاده از میدل‌ویر احراز هویت

```javascript
import { authenticateToken, requireRole } from '@tadbir-khowan/shared';

// احراز هویت الزامی
app.use('/api', authenticateToken);

// نیاز به نقش خاص
app.use('/admin', requireRole(['catering_manager']));

// نیاز به مالکیت منبع
app.use('/orders/:id', requireOwnership('id', 'order'));
```

### 3. لاگ‌گیری حسابرسی (Audit Logging)

#### انواع لاگ‌های حسابرسی
- ورود و خروج کاربران
- تراکنش‌های مالی
- تغییر داده‌های حساس
- دسترسی به داده‌های حساس
- تلاش‌های دسترسی غیرمجاز
- تغییر نقش کاربران
- حذف داده‌ها
- صادرات داده‌ها

#### استفاده از سیستم حسابرسی

```javascript
import { AuditLogger } from '@tadbir-khowan/shared';

// ثبت لاگ ورود کاربر
await AuditLogger.logUserLogin(userId, ipAddress, userAgent, true);

// ثبت لاگ تراکنش مالی
await AuditLogger.logFinancialTransaction(
  userId, 'payment', 50000, orderId, paymentId, ipAddress, userAgent
);

// ثبت لاگ تغییر داده حساس
await AuditLogger.logSensitiveDataChange(
  userId, 'user_profile', userId, oldData, newData, ipAddress, userAgent
);
```

### 4. نظارت امنیتی (Security Monitoring)

#### تشخیص تهدیدات
- تلاش‌های ورود ناموفق (حداکثر 5 در 15 دقیقه)
- IP های مشکوک (حداکثر 3 IP مختلف در ساعت)
- درخواست‌های سریع (حداکثر 100 در دقیقه)
- دسترسی غیرعادی به داده‌های حساس (حداکثر 20 در ساعت)
- الگوهای غیرعادی رفتاری

#### استفاده از نظارت امنیتی

```javascript
import { securityMonitor } from '@tadbir-khowan/shared';

// بررسی جامع امنیت
const securityStatus = await securityMonitor.performSecurityCheck(
  userId, ipAddress, userAgent, endpoint
);

if (securityStatus.isBlocked) {
  return res.status(403).json({ error: 'دسترسی مسدود شده است' });
}
```

### 5. محدودیت نرخ درخواست (Rate Limiting)

#### انواع محدودیت‌ها
- **عمومی**: 100 درخواست در 15 دقیقه
- **ورود**: 5 تلاش در 15 دقیقه
- **API های حساس**: 10 درخواست در ساعت

#### پیاده‌سازی

```javascript
import { createRateLimiter } from '@tadbir-khowan/shared';

// محدودیت عمومی
app.use(createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

// محدودیت ورود
app.use('/auth/login', createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true
}));
```

### 6. تشخیص حملات (Attack Detection)

#### انواع حملات قابل تشخیص
- **XSS**: تزریق اسکریپت
- **SQL Injection**: تزریق SQL
- **Path Traversal**: دسترسی غیرمجاز به فایل‌ها
- **Code Injection**: تزریق کد

#### استفاده از تشخیص حملات

```javascript
import { detectAttacks } from '@tadbir-khowan/shared';

// اعمال تشخیص حملات به تمام مسیرها
app.use(detectAttacks);
```

## پیکربندی امنیتی

### متغیرهای محیطی مورد نیاز

```bash
# JWT
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=24h

# رمزنگاری
ENCRYPTION_KEY=your-32-character-encryption-key

# رمز عبور
PASSWORD_SALT_ROUNDS=12
PASSWORD_MIN_LENGTH=8

# پایگاه داده
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tadbir_security
DB_USER=postgres
DB_PASSWORD=password

# Redis (برای کش)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# لاگ‌گیری
LOG_LEVEL=INFO
```

### نصب و راه‌اندازی

1. **نصب وابستگی‌ها**:
```bash
npm install @tadbir-khowan/shared
```

2. **اجرای migration های امنیتی**:
```bash
psql -d tadbir_security -f shared/migrations/001_create_security_tables.sql
```

3. **پیکربندی سرویس**:
```javascript
import { 
  authenticateToken, 
  requireRole, 
  createRateLimiter,
  detectAttacks,
  logRequest
} from '@tadbir-khowan/shared';

// اعمال میدل‌ویرهای امنیتی
app.use(logRequest);
app.use(detectAttacks);
app.use(createRateLimiter());
app.use('/api', authenticateToken);
```

## بهترین شیوه‌های امنیتی

### 1. مدیریت کلیدها
- کلیدهای رمزنگاری را هرگز در کد قرار ندهید
- از متغیرهای محیطی استفاده کنید
- کلیدها را به صورت دوره‌ای تغییر دهید
- از HSM برای محیط تولید استفاده کنید

### 2. رمز عبور
- حداقل 8 کاراکتر
- ترکیب حروف بزرگ، کوچک و عدد
- عدم استفاده مجدد از رمزهای قبلی
- انقضای دوره‌ای (90 روز)

### 3. Session Management
- انقضای خودکار session ها
- پاک‌سازی session های منقضی شده
- محدودیت تعداد session های همزمان

### 4. نظارت و هشدار
- نظارت مداوم بر فعالیت‌های مشکوک
- هشدار فوری برای تهدیدات جدی
- بررسی دوره‌ای لاگ‌های حسابرسی

### 5. به‌روزرسانی امنیتی
- به‌روزرسانی منظم وابستگی‌ها
- پچ امنیتی سریع
- تست امنیتی مداوم

## نظارت و گزارش‌گیری

### داشبورد امنیتی
- تعداد لاگ‌های حسابرسی روزانه
- هشدارهای امنیتی فعال
- IP های مسدود شده
- Session های فعال

### گزارش‌های امنیتی
- گزارش ماهانه فعالیت‌های امنیتی
- تحلیل تهدیدات
- آمار تلاش‌های نفوذ
- عملکرد سیستم‌های امنیتی

## پاسخ به حوادث امنیتی

### مراحل پاسخ
1. **تشخیص**: شناسایی تهدید یا نقض امنیت
2. **مهار**: جلوگیری از گسترش آسیب
3. **بررسی**: تحلیل علت و میزان آسیب
4. **بازیابی**: بازگردانی سیستم به حالت عادی
5. **درس‌آموزی**: بهبود سیستم‌های امنیتی

### اقدامات فوری
- مسدود کردن IP های مشکوک
- غیرفعال کردن حساب‌های در معرض خطر
- اعلان فوری به مدیران سیستم
- پشتیبان‌گیری اضطراری از داده‌ها

## تست امنیتی

### انواع تست
- **تست نفوذ**: شبیه‌سازی حملات واقعی
- **تست آسیب‌پذیری**: اسکن خودکار نقاط ضعف
- **تست کد**: بررسی کد برای مشکلات امنیتی
- **تست پیکربندی**: بررسی تنظیمات امنیتی

### ابزارهای توصیه شده
- OWASP ZAP برای تست وب
- SonarQube برای تحلیل کد
- Nmap برای اسکن شبکه
- Burp Suite برای تست API

## مطابقت با استانداردها

### استانداردهای رعایت شده
- **OWASP Top 10**: محافظت در برابر 10 تهدید برتر وب
- **ISO 27001**: مدیریت امنیت اطلاعات
- **PCI DSS**: امنیت داده‌های کارت اعتباری
- **GDPR**: حفاظت از داده‌های شخصی

### الزامات قانونی
- رمزنگاری داده‌های شخصی
- نگهداری لاگ‌های حسابرسی
- اعلان نقض امنیت
- حق حذف داده‌ها

## پشتیبانی و تماس

برای گزارش مشکلات امنیتی یا دریافت راهنمایی بیشتر:

- **ایمیل امنیت**: security@tadbir-khowan.com
- **تلفن اضطراری**: +98-21-xxxxxxxx
- **پورتال گزارش**: https://security.tadbir-khowan.com

---

**نکته مهم**: این سند باید به صورت دوره‌ای به‌روزرسانی شود و تمام تغییرات امنیتی در آن منعکس گردد.