# راهنمای سریع راه‌اندازی سیستم تدبیرخوان

## وضعیت فعلی سیستم ✅

سیستم تدبیرخوان با موفقیت راه‌اندازی شده و در حال اجرا است!

### سرویس‌های فعال:

1. **Frontend (React)** - پورت 3000
   - آدرس: http://localhost:3000
   - وضعیت: ✅ فعال

2. **API Gateway** - پورت 8000
   - آدرس: http://localhost:8000
   - وضعیت: ✅ فعال
   - Health Check: http://localhost:8000/health

3. **Auth Service** - پورت 3001
   - آدرس: http://localhost:3001
   - وضعیت: ✅ فعال
   - Health Check: http://localhost:3001/health

## آدرس‌های مهم:

- **وب‌سایت اصلی**: http://localhost:3000
- **API Gateway**: http://localhost:8000
- **API تست**: http://localhost:8000/api/test
- **تست احراز هویت**: http://localhost:8000/api/auth-test

## تست سریع سیستم:

### 1. تست Frontend:
```bash
curl http://localhost:3000
```

### 2. تست API Gateway:
```bash
curl http://localhost:8000/health
```

### 3. تست Auth Service:
```bash
curl http://localhost:3001/health
```

### 4. تست Login (مستقیم):
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
```

### 5. تست Login (از طریق API Gateway):
```bash
curl -X POST http://localhost:8000/api/auth-test \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
```

## ویژگی‌های فعال:

✅ Frontend React با Tailwind CSS
✅ API Gateway با Proxy
✅ Auth Service با Mock Authentication
✅ CORS پیکربندی شده
✅ Security Headers (Helmet)
✅ Rate Limiting
✅ Error Handling
✅ Health Checks

## نکات مهم:

1. **دیتابیس**: فعلاً از SQLite و Memory Cache استفاده می‌شود
2. **Authentication**: Mock authentication پیاده‌سازی شده
3. **Services**: فقط Auth Service فعال است، بقیه services آماده‌اند
4. **Production**: برای production باید PostgreSQL و Redis نصب شوند

## راه‌اندازی سایر Services:

برای راه‌اندازی سایر microservices:

```bash
# User Management Service
cd services/user-management && npm run dev

# Menu Management Service  
cd services/menu-management && npm run dev

# Order Management Service
cd services/order-management && npm run dev

# Payment Service
cd services/payment && npm run dev

# Notification Service
cd services/notification && npm run dev

# Reporting Service
cd services/reporting && npm run dev
```

## توقف سیستم:

برای توقف تمام services، terminal های مربوطه را ببندید یا Ctrl+C بزنید.

## مشکلات رایج:

1. **Port در حال استفاده**: اگر پورتی در حال استفاده است، آن را در فایل .env تغییر دهید
2. **CORS Error**: مطمئن شوید ALLOWED_ORIGINS درست تنظیم شده
3. **Proxy Timeout**: timeout در API Gateway افزایش یافته

## لاگ‌ها:

- Frontend: Terminal مربوط به frontend
- API Gateway: Terminal مربوط به api-gateway  
- Auth Service: Terminal مربوط به auth

---

🎉 **سیستم تدبیرخوان آماده استفاده است!**

برای دسترسی به وب‌سایت: http://localhost:3000