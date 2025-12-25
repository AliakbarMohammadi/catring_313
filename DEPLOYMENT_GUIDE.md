# راهنمای کامل راه‌اندازی پروژه تدبیرخوان

## پیش‌نیازها

### نرم‌افزارهای مورد نیاز:
```bash
# Node.js (نسخه 18 یا بالاتر)
node --version

# npm یا yarn
npm --version

# PostgreSQL (نسخه 14 یا بالاتر)
psql --version

# Redis (نسخه 6 یا بالاتر)
redis-server --version

# Docker (اختیاری برای containerization)
docker --version
```

## مرحله 1: راه‌اندازی دیتابیس

### PostgreSQL Setup:

1. **نصب PostgreSQL:**
```bash
# Windows (با Chocolatey)
choco install postgresql

# یا دانلود از سایت رسمی
# https://www.postgresql.org/download/windows/
```

2. **ایجاد دیتابیس:**
```sql
-- اتصال به PostgreSQL
psql -U postgres

-- ایجاد دیتابیس اصلی
CREATE DATABASE tadbir_khowan;

-- ایجاد کاربر برای اپلیکیشن
CREATE USER tadbir_user WITH PASSWORD 'your_secure_password';

-- دادن دسترسی‌ها
GRANT ALL PRIVILEGES ON DATABASE tadbir_khowan TO tadbir_user;

-- خروج
\q
```

### Redis Setup:

1. **نصب Redis:**
```bash
# Windows (با Chocolatey)
choco install redis-64

# یا دانلود از GitHub
# https://github.com/microsoftarchive/redis/releases
```

2. **راه‌اندازی Redis:**
```bash
# شروع Redis server
redis-server

# تست اتصال (در terminal جدید)
redis-cli ping
# باید پاسخ PONG بدهد
```

## مرحله 2: تنظیم متغیرهای محیطی

### ایجاد فایل‌های .env:

1. **برای shared components:**
```bash
# shared/.env
DATABASE_URL=postgresql://tadbir_user:your_secure_password@localhost:5432/tadbir_khowan
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
ENCRYPTION_KEY=your_32_character_encryption_key_here
NODE_ENV=development
```

2. **برای هر service:**
```bash
# services/auth/.env
PORT=3001
DATABASE_URL=postgresql://tadbir_user:your_secure_password@localhost:5432/tadbir_khowan
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# services/user-management/.env
PORT=3002
DATABASE_URL=postgresql://tadbir_user:your_secure_password@localhost:5432/tadbir_khowan
AUTH_SERVICE_URL=http://localhost:3001

# services/menu-management/.env
PORT=3003
DATABASE_URL=postgresql://tadbir_user:your_secure_password@localhost:5432/tadbir_khowan
AUTH_SERVICE_URL=http://localhost:3001

# services/order-management/.env
PORT=3004
DATABASE_URL=postgresql://tadbir_user:your_secure_password@localhost:5432/tadbir_khowan
AUTH_SERVICE_URL=http://localhost:3001
MENU_SERVICE_URL=http://localhost:3003
PAYMENT_SERVICE_URL=http://localhost:3007

# services/notification/.env
PORT=3005
DATABASE_URL=postgresql://tadbir_user:your_secure_password@localhost:5432/tadbir_khowan
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMS_API_KEY=your_sms_provider_api_key

# services/reporting/.env
PORT=3006
DATABASE_URL=postgresql://tadbir_user:your_secure_password@localhost:5432/tadbir_khowan
AUTH_SERVICE_URL=http://localhost:3001

# services/payment/.env
PORT=3007
DATABASE_URL=postgresql://tadbir_user:your_secure_password@localhost:5432/tadbir_khowan
AUTH_SERVICE_URL=http://localhost:3001
PAYMENT_GATEWAY_URL=https://your-payment-gateway.com
PAYMENT_GATEWAY_KEY=your_payment_gateway_key

# services/api-gateway/.env
PORT=3000
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
MENU_SERVICE_URL=http://localhost:3003
ORDER_SERVICE_URL=http://localhost:3004
NOTIFICATION_SERVICE_URL=http://localhost:3005
REPORTING_SERVICE_URL=http://localhost:3006
PAYMENT_SERVICE_URL=http://localhost:3007
REDIS_URL=redis://localhost:6379

# frontend/.env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=تدبیرخوان
```

## مرحله 3: نصب Dependencies

```bash
# نصب dependencies برای root project
npm install

# نصب dependencies برای shared components
cd shared
npm install
cd ..

# نصب dependencies برای هر service
cd services/auth && npm install && cd ../..
cd services/user-management && npm install && cd ../..
cd services/menu-management && npm install && cd ../..
cd services/order-management && npm install && cd ../..
cd services/notification && npm install && cd ../..
cd services/reporting && npm install && cd ../..
cd services/payment && npm install && cd ../..
cd services/api-gateway && npm install && cd ../..

# نصب dependencies برای frontend
cd frontend && npm install && cd ..
```

## مرحله 4: راه‌اندازی دیتابیس

```bash
# اجرای migrations
cd shared
npm run migrate

# اجرای seed data (اختیاری برای development)
npm run seed

cd ..
```

## مرحله 5: راه‌اندازی Services

### روش 1: راه‌اندازی دستی (Development)

```bash
# Terminal 1: Auth Service
cd services/auth
npm run dev

# Terminal 2: User Management Service
cd services/user-management
npm run dev

# Terminal 3: Menu Management Service
cd services/menu-management
npm run dev

# Terminal 4: Order Management Service
cd services/order-management
npm run dev

# Terminal 5: Notification Service
cd services/notification
npm run dev

# Terminal 6: Reporting Service
cd services/reporting
npm run dev

# Terminal 7: Payment Service
cd services/payment
npm run dev

# Terminal 8: API Gateway
cd services/api-gateway
npm run dev

# Terminal 9: Frontend
cd frontend
npm run dev
```

### روش 2: استفاده از Docker Compose

1. **ایجاد docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: tadbir_khowan
      POSTGRES_USER: tadbir_user
      POSTGRES_PASSWORD: your_secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"

  auth-service:
    build: ./services/auth
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://tadbir_user:your_secure_password@postgres:5432/tadbir_khowan
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  user-service:
    build: ./services/user-management
    ports:
      - "3002:3002"
    environment:
      - DATABASE_URL=postgresql://tadbir_user:your_secure_password@postgres:5432/tadbir_khowan
      - AUTH_SERVICE_URL=http://auth-service:3001
    depends_on:
      - postgres
      - auth-service

  menu-service:
    build: ./services/menu-management
    ports:
      - "3003:3003"
    environment:
      - DATABASE_URL=postgresql://tadbir_user:your_secure_password@postgres:5432/tadbir_khowan
      - AUTH_SERVICE_URL=http://auth-service:3001
    depends_on:
      - postgres
      - auth-service

  order-service:
    build: ./services/order-management
    ports:
      - "3004:3004"
    environment:
      - DATABASE_URL=postgresql://tadbir_user:your_secure_password@postgres:5432/tadbir_khowan
      - AUTH_SERVICE_URL=http://auth-service:3001
      - MENU_SERVICE_URL=http://menu-service:3003
    depends_on:
      - postgres
      - auth-service
      - menu-service

  notification-service:
    build: ./services/notification
    ports:
      - "3005:3005"
    environment:
      - DATABASE_URL=postgresql://tadbir_user:your_secure_password@postgres:5432/tadbir_khowan
    depends_on:
      - postgres

  reporting-service:
    build: ./services/reporting
    ports:
      - "3006:3006"
    environment:
      - DATABASE_URL=postgresql://tadbir_user:your_secure_password@postgres:5432/tadbir_khowan
      - AUTH_SERVICE_URL=http://auth-service:3001
    depends_on:
      - postgres
      - auth-service

  payment-service:
    build: ./services/payment
    ports:
      - "3007:3007"
    environment:
      - DATABASE_URL=postgresql://tadbir_user:your_secure_password@postgres:5432/tadbir_khowan
      - AUTH_SERVICE_URL=http://auth-service:3001
    depends_on:
      - postgres
      - auth-service

  api-gateway:
    build: ./services/api-gateway
    ports:
      - "3000:3000"
    environment:
      - AUTH_SERVICE_URL=http://auth-service:3001
      - USER_SERVICE_URL=http://user-service:3002
      - MENU_SERVICE_URL=http://menu-service:3003
      - ORDER_SERVICE_URL=http://order-service:3004
      - NOTIFICATION_SERVICE_URL=http://notification-service:3005
      - REPORTING_SERVICE_URL=http://reporting-service:3006
      - PAYMENT_SERVICE_URL=http://payment-service:3007
      - REDIS_URL=redis://redis:6379
    depends_on:
      - auth-service
      - user-service
      - menu-service
      - order-service
      - notification-service
      - reporting-service
      - payment-service

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=http://localhost:3000
    depends_on:
      - api-gateway

volumes:
  postgres_data:
```

2. **راه‌اندازی با Docker:**
```bash
# ساخت و راه‌اندازی تمام services
docker-compose up --build

# راه‌اندازی در background
docker-compose up -d

# مشاهده logs
docker-compose logs -f

# توقف services
docker-compose down
```

## مرحله 6: تست سیستم

### 1. تست API Gateway:
```bash
curl http://localhost:3000/health
# باید پاسخ {"status": "ok"} بدهد
```

### 2. تست Authentication:
```bash
# ثبت‌نام کاربر جدید
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "تست کاربر",
    "email": "test@example.com",
    "password": "123456",
    "phone": "09123456789",
    "role": "individual"
  }'

# ورود کاربر
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "123456"
  }'
```

### 3. تست Frontend:
```
مرورگر را باز کنید و به آدرس http://localhost:3000 بروید
```

## مرحله 7: اجرای تست‌ها

```bash
# تست‌های integration
cd frontend
npm test

# تست‌های E2E
npx playwright test

# تست‌های property-based (در shared)
cd ../shared
npm test
```

## مرحله 8: Monitoring و Logging

### 1. نصب PM2 برای production:
```bash
npm install -g pm2

# ایجاد ecosystem file
# ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'auth-service',
      script: './services/auth/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'user-service',
      script: './services/user-management/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      }
    },
    // ... سایر services
  ]
}

# راه‌اندازی با PM2
pm2 start ecosystem.config.js

# مشاهده وضعیت
pm2 status

# مشاهده logs
pm2 logs
```

## مرحله 9: SSL و Domain Setup

### 1. تنظیم Nginx:
```nginx
# /etc/nginx/sites-available/tadbir-khowan
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. SSL با Let's Encrypt:
```bash
# نصب Certbot
sudo apt install certbot python3-certbot-nginx

# دریافت SSL certificate
sudo certbot --nginx -d your-domain.com
```

## مرحله 10: Backup و Maintenance

### 1. Backup دیتابیس:
```bash
# ایجاد backup
pg_dump -U tadbir_user -h localhost tadbir_khowan > backup_$(date +%Y%m%d_%H%M%S).sql

# بازیابی backup
psql -U tadbir_user -h localhost tadbir_khowan < backup_file.sql
```

### 2. Monitoring:
```bash
# نصب monitoring tools
npm install -g clinic
npm install -g autocannon

# تست performance
autocannon -c 100 -d 30 http://localhost:3000
```

## آدرس‌های مهم پس از راه‌اندازی:

- **Frontend**: http://localhost:3000 (یا domain شما)
- **API Gateway**: http://localhost:3000/api
- **Admin Dashboard**: http://localhost:3000/admin
- **API Documentation**: http://localhost:3000/api/docs

## عیب‌یابی رایج:

### 1. خطای اتصال به دیتابیس:
```bash
# بررسی وضعیت PostgreSQL
sudo systemctl status postgresql

# بررسی اتصال
psql -U tadbir_user -h localhost -d tadbir_khowan
```

### 2. خطای Redis:
```bash
# بررسی وضعیت Redis
redis-cli ping

# راه‌اندازی مجدد
sudo systemctl restart redis
```

### 3. خطای Port در حال استفاده:
```bash
# پیدا کردن process
lsof -i :3000

# کشتن process
kill -9 PID
```

## پشتیبانی و به‌روزرسانی:

### 1. به‌روزرسانی dependencies:
```bash
npm audit
npm update
```

### 2. Migration جدید:
```bash
cd shared
npm run migrate
```

### 3. Backup منظم:
```bash
# اضافه کردن به crontab
0 2 * * * /path/to/backup-script.sh
```

---

**نکته مهم**: قبل از production، حتماً تمام متغیرهای محیطی را با مقادیر امن جایگزین کنید و security audit انجام دهید.

آیا سوال خاصی در مورد هر کدام از این مراحل داری؟