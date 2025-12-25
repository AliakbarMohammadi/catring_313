# Database Layer - تدبیرخوان

مستندات کامل لایه دیتابیس سیستم تدبیرخوان شامل schema ها، migration ها و تنظیمات.

## معماری دیتابیس

### دیتابیس اصلی: PostgreSQL
- **محیط Development**: `tadbir_khowan_dev`
- **محیط Test**: `tadbir_khowan_test`
- **محیط Production**: `tadbir_khowan_prod`

### Cache و Session: Redis
- **Port**: 6379 (پیش‌فرض)
- **استفاده**: Cache، Session، Queue

## ساختار جداول

### 👥 کاربران و احراز هویت
- **users**: اطلاعات کاربران
- **companies**: اطلاعات شرکت‌ها
- **employees**: ارتباط کاربران با شرکت‌ها

### 🍽️ مدیریت منو
- **food_categories**: دسته‌بندی غذاها
- **food_items**: اقلام غذایی
- **daily_menus**: منوهای روزانه
- **menu_items**: اقلام منوی روزانه

### 📦 سفارشات
- **orders**: سفارشات
- **order_items**: اقلام سفارش

### 💳 پرداخت و مالی
- **payments**: پرداخت‌ها
- **invoices**: فاکتورها

### 🔔 اعلان‌رسانی
- **notifications**: اعلان‌ها
- **notification_preferences**: تنظیمات اعلان‌رسانی

### 🔒 امنیت و Audit
- **audit_logs**: لاگ‌های audit
- **security_events**: رویدادهای امنیتی

## Migration ها

### اجرای Migration ها

```bash
# اجرای تمام migration های pending
npm run migrate:up

# بازگردانی آخرین migration
npm run migrate:down

# بازگردانی 3 migration آخر
npm run migrate:down 3

# نمایش وضعیت migration ها
npm run migrate:status

# ریست کامل دیتابیس (خطرناک!)
npm run migrate:reset
```

### ایجاد Migration جدید

```bash
# ایجاد migration جدید
node shared/scripts/migrate.js create "add_user_preferences"
```

### فهرست Migration ها

1. **001_create_users_table.js** - جدول کاربران
2. **002_create_companies_table.js** - جدول شرکت‌ها
3. **003_create_employees_table.js** - جدول کارمندان
4. **004_create_food_categories_table.js** - دسته‌بندی غذاها
5. **005_create_food_items_table.js** - اقلام غذایی
6. **006_create_daily_menus_table.js** - منوهای روزانه
7. **007_create_menu_items_table.js** - اقلام منوی روزانه
8. **008_create_orders_table.js** - سفارشات
9. **009_create_order_items_table.js** - اقلام سفارش
10. **010_create_payments_table.js** - پرداخت‌ها
11. **011_create_invoices_table.js** - فاکتورها
12. **012_create_notifications_table.js** - اعلان‌ها
13. **013_create_notification_preferences_table.js** - تنظیمات اعلان‌رسانی
14. **014_create_audit_logs_table.js** - لاگ‌های audit
15. **015_create_security_events_table.js** - رویدادهای امنیتی

## Seed داده‌ها

### اجرای Seed

```bash
# درج داده‌های development
npm run seed

# درج داده‌های test
npm run seed:test

# پاک کردن تمام داده‌ها
npm run seed:clear

# ریست و درج مجدد
npm run seed:reset

# راه‌اندازی کامل دیتابیس
npm run db:setup
```

### داده‌های پیش‌فرض

#### کاربران نمونه:
- **مدیر سیستم**: `admin@tadbirkhawan.com` / `Admin123!`
- **مدیر شرکت**: `company@example.com` / `Company123!`
- **کاربر عادی**: `user@example.com` / `User123!`

#### دسته‌بندی غذاها:
- غذای اصلی
- پیش غذا
- نوشیدنی
- دسر
- میان وعده

#### اقلام غذایی نمونه:
- چلو کباب کوبیده
- خورشت قیمه
- سالاد فصل
- دوغ

## تنظیمات دیتابیس

### متغیرهای محیطی

```env
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tadbir_khowan_dev
DB_USERNAME=postgres
DB_PASSWORD=password
DB_SSL=false

# Test Database
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_NAME=tadbir_khowan_test
TEST_DB_USERNAME=postgres
TEST_DB_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Connection Pool

```javascript
pool: {
  max: 20,        // حداکثر اتصال
  min: 5,         // حداقل اتصال
  acquire: 60000, // زمان انتظار برای اتصال (60 ثانیه)
  idle: 10000     // زمان بیکاری قبل از بستن (10 ثانیه)
}
```

## Index ها و بهینه‌سازی

### Index های مهم

#### جدول users:
- `users_email_unique_idx` (UNIQUE)
- `users_user_type_idx`
- `users_status_idx`
- `users_created_at_idx`

#### جدول orders:
- `orders_order_number_unique_idx` (UNIQUE)
- `orders_user_id_idx`
- `orders_status_idx`
- `orders_delivery_date_idx`

#### جدول food_items:
- `food_items_name_idx`
- `food_items_category_id_idx`
- `food_items_is_available_idx`
- `food_items_tags_gin_idx` (GIN)

### Index های JSONB

برای فیلدهای JSONB از GIN index استفاده می‌شود:

```sql
CREATE INDEX food_items_nutritional_info_gin_idx 
ON food_items USING gin (nutritional_info);
```

## Enum Types

### User Types
```sql
CREATE TYPE "user_type_enum" AS ENUM (
  'individual_user', 
  'company_admin', 
  'catering_manager'
);
```

### Order Status
```sql
CREATE TYPE "order_status_enum" AS ENUM (
  'pending', 
  'confirmed', 
  'preparing', 
  'ready', 
  'delivered', 
  'cancelled'
);
```

### Payment Status
```sql
CREATE TYPE "payment_status_enum" AS ENUM (
  'pending', 
  'processing', 
  'completed', 
  'failed', 
  'cancelled', 
  'refunded'
);
```

## Sequelize ORM

### پیکربندی

```javascript
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(database, username, password, {
  host: 'localhost',
  dialect: 'postgres',
  logging: console.log,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
});
```

### استفاده در سرویس‌ها

```javascript
import { sequelize } from '@tadbir-khowan/shared/config/database.js';

// تست اتصال
await sequelize.authenticate();

// همگام‌سازی مدل‌ها
await sequelize.sync({ alter: true });

// اجرای query
const users = await sequelize.query(
  'SELECT * FROM users WHERE status = :status',
  {
    replacements: { status: 'active' },
    type: QueryTypes.SELECT
  }
);
```

## Redis Configuration

### اتصال Redis

```javascript
import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null
});
```

### استفاده‌های Redis

#### Cache
```javascript
// ذخیره در cache
await redis.setex('user:123', 3600, JSON.stringify(userData));

// خواندن از cache
const cached = await redis.get('user:123');
```

#### Session
```javascript
// ذخیره session
await redis.setex(`session:${sessionId}`, 86400, JSON.stringify(sessionData));

// حذف session
await redis.del(`session:${sessionId}`);
```

#### Queue
```javascript
// اضافه کردن به queue
await redis.lpush('email_queue', JSON.stringify(emailData));

// خواندن از queue
const job = await redis.brpop('email_queue', 0);
```

## Backup و Recovery

### Backup خودکار

```bash
#!/bin/bash
# backup.sh

DB_NAME="tadbir_khowan_prod"
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

pg_dump $DB_NAME > $BACKUP_DIR/backup_$DATE.sql
```

### Recovery

```bash
# بازیابی از backup
psql tadbir_khowan_prod < backup_20241225_120000.sql
```

## Monitoring و Performance

### Query Performance

```sql
-- فعال‌سازی pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- مشاهده کندترین query ها
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

### Connection Monitoring

```sql
-- مشاهده اتصالات فعال
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  query
FROM pg_stat_activity
WHERE state = 'active';
```

## Security

### Row Level Security (RLS)

```sql
-- فعال‌سازی RLS برای جدول orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- ایجاد policy
CREATE POLICY user_orders ON orders
FOR ALL TO authenticated_users
USING (user_id = current_user_id());
```

### Data Encryption

فیلدهای حساس با استفاده از کتابخانه encryption رمزنگاری می‌شوند:

- رمزهای عبور (bcrypt)
- اطلاعات پرداخت (AES-256)
- اطلاعات شخصی (AES-256)

## Troubleshooting

### مشکلات رایج

#### خطای اتصال دیتابیس
```bash
# بررسی وضعیت PostgreSQL
sudo systemctl status postgresql

# راه‌اندازی مجدد
sudo systemctl restart postgresql
```

#### خطای Migration
```bash
# بررسی وضعیت migration ها
npm run migrate:status

# اجرای مجدد migration ناموفق
npm run migrate:down 1
npm run migrate:up
```

#### مشکل Performance
```sql
-- بررسی index های گمشده
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
AND n_distinct > 100;
```

## Best Practices

### Migration ها
- همیشه migration های reversible بنویسید
- از transaction استفاده کنید
- Index ها را همزمان با جداول ایجاد کنید
- Enum ها را با دقت تغییر دهید

### Performance
- از Connection Pool استفاده کنید
- Query های پیچیده را بهینه‌سازی کنید
- از Index های مناسب استفاده کنید
- JSONB را برای داده‌های نیمه‌ساختاریافته استفاده کنید

### Security
- همیشه از Prepared Statement استفاده کنید
- داده‌های حساس را رمزنگاری کنید
- دسترسی‌ها را محدود کنید
- Audit log نگه دارید

### Backup
- Backup روزانه خودکار
- تست Recovery دوره‌ای
- نگهداری چندین نسخه backup
- Backup از Redis برای داده‌های مهم