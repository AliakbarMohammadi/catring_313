# API Gateway - تدبیرخوان

API Gateway مرکزی برای مدیریت تمام درخواست‌ها و ارتباط بین سرویس‌های سیستم تدبیرخوان.

## ویژگی‌ها

### 🔒 امنیت
- احراز هویت JWT
- کنترل دسترسی مبتنی بر نقش (RBAC)
- محدودیت نرخ درخواست (Rate Limiting)
- تشخیص حملات امنیتی
- CORS امن
- Header های امنیتی با Helmet

### ⚖️ Load Balancing
- الگوریتم Round Robin
- مدیریت نمونه‌های متعدد سرویس‌ها
- حذف خودکار نمونه‌های ناسالم
- توزیع بار هوشمند

### 🔄 Circuit Breaker
- جلوگیری از Cascade Failure
- سه حالت: CLOSED، OPEN، HALF_OPEN
- بازیابی خودکار
- تنظیمات قابل تنظیم برای هر سرویس

### 🔍 Service Discovery
- کشف خودکار سرویس‌ها
- Health Check دوره‌ای
- مدیریت نمونه‌های سالم/ناسالم
- نظارت بر وضعیت سرویس‌ها

### 📡 Event Bus
- ارتباط async بین سرویس‌ها
- مدیریت اشتراک/لغو اشتراک
- Retry mechanism برای رویدادهای ناموفق
- تاریخچه رویدادها

### 🌐 Service Client
- HTTP Client برای ارتباط بین سرویس‌ها
- Retry mechanism
- Circuit Breaker integration
- API های ساده برای تمام سرویس‌ها

## ساختار پروژه

```
services/api-gateway/
├── server.js                 # سرور اصلی
├── middleware/
│   ├── loadBalancer.js      # Load Balancer
│   └── circuitBreaker.js    # Circuit Breaker
├── services/
│   ├── serviceDiscovery.js  # Service Discovery
│   ├── serviceClient.js     # HTTP Client
│   └── eventBus.js         # Event Bus
├── examples/
│   └── serviceIntegrationExample.js  # مثال استفاده
└── README.md
```

## راه‌اندازی

### 1. نصب Dependencies

```bash
cd services/api-gateway
npm install
```

### 2. تنظیم متغیرهای محیطی

فایل `.env` ایجاد کنید:

```env
PORT=3000
NODE_ENV=development

# URLs سرویس‌ها
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
MENU_SERVICE_URL=http://localhost:3003
ORDER_SERVICE_URL=http://localhost:3004
PAYMENT_SERVICE_URL=http://localhost:3005
NOTIFICATION_SERVICE_URL=http://localhost:3006
REPORTING_SERVICE_URL=http://localhost:3007

# امنیت
JWT_SECRET=your-jwt-secret
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

### 3. اجرای سرویس

```bash
npm start
```

## API های موجود

### Health Check

```http
GET /health
GET /health/services
```

### مدیریت سرویس‌ها (فقط مدیران)

```http
GET /admin/services
POST /admin/circuit-breaker/reset/:serviceName?
```

### Event Bus (فقط مدیران)

```http
GET /admin/events/stats
GET /admin/events/history
```

### Event Bus (فقط سرویس‌ها)

```http
POST /internal/events/publish
POST /internal/events/subscribe
DELETE /internal/events/subscribe/:subscriberId
```

### پروکسی سرویس‌ها

```http
# احراز هویت
POST /api/auth/login
POST /api/auth/register
GET /api/auth/profile

# مدیریت کاربران
GET /api/users/:id
PUT /api/users/:id
POST /api/users/register

# مدیریت منو
GET /api/menu/daily/:date
POST /api/menu/items
PUT /api/menu/items/:id

# مدیریت سفارشات
POST /api/orders
GET /api/orders/:id
PUT /api/orders/:id/status

# پرداخت
POST /api/payments/process
GET /api/payments/:id/status

# اعلان‌رسانی
POST /api/notifications/send
GET /api/notifications/preferences/:userId

# گزارش‌گیری (فقط مدیران)
GET /api/reporting/sales
GET /api/reporting/dashboard
```

## استفاده در سرویس‌ها

### 1. Service Client

```javascript
import { createServiceClient } from '../../../shared/utils/serviceClient.js';

const serviceClient = createServiceClient({
  serviceName: 'my-service',
  gatewayUrl: 'http://localhost:3000'
});

// فراخوانی سرویس کاربران
const userService = await serviceClient.users();
const user = await userService.getUser('user123');

// فراخوانی سرویس سفارشات
const orderService = await serviceClient.orders();
const orders = await orderService.getUserOrders('user123');
```

### 2. Event Handler

```javascript
import { createEventHandler, SystemEvents } from '../../../shared/utils/eventHandler.js';

const eventHandler = createEventHandler('my-service');

// ثبت handler برای رویداد
eventHandler.on(SystemEvents.USER_REGISTERED, async (userData, event) => {
  console.log('کاربر جدید ثبت‌نام کرد:', userData);
  // پردازش رویداد...
});

// اشتراک در رویداد
await eventHandler.subscribe(SystemEvents.USER_REGISTERED, '/events/user-registered');

// انتشار رویداد
await eventHandler.emit(SystemEvents.ORDER_CREATED, {
  orderId: 'order123',
  userId: 'user123',
  items: [...]
});
```

### 3. Express Middleware

```javascript
import { eventMiddleware } from '../../../shared/utils/eventHandler.js';

const app = express();
app.use(express.json());
app.use(eventMiddleware(eventHandler));

// endpoint برای دریافت رویدادها
app.post('/events/user-registered', (req, res) => {
  // پردازش توسط eventMiddleware
  res.json({ message: 'Event received' });
});
```

## رویدادهای سیستم

### رویدادهای کاربر
- `user.registered` - ثبت‌نام کاربر جدید
- `user.updated` - به‌روزرسانی اطلاعات کاربر
- `user.deleted` - حذف کاربر

### رویدادهای شرکت
- `company.registered` - ثبت‌نام شرکت جدید
- `company.approved` - تایید شرکت
- `company.rejected` - رد شرکت

### رویدادهای سفارش
- `order.created` - ایجاد سفارش جدید
- `order.confirmed` - تایید سفارش
- `order.cancelled` - لغو سفارش
- `order.completed` - تکمیل سفارش

### رویدادهای پرداخت
- `payment.initiated` - شروع پرداخت
- `payment.completed` - تکمیل پرداخت
- `payment.failed` - شکست پرداخت

## نظارت و عیب‌یابی

### 1. بررسی وضعیت سرویس‌ها

```bash
curl http://localhost:3000/health/services
```

### 2. مشاهده آمار Event Bus

```bash
curl -H "Authorization: Bearer <admin-token>" \
     http://localhost:3000/admin/events/stats
```

### 3. مشاهده تاریخچه رویدادها

```bash
curl -H "Authorization: Bearer <admin-token>" \
     "http://localhost:3000/admin/events/history?eventType=user.registered&limit=10"
```

### 4. ریست Circuit Breaker

```bash
curl -X POST \
     -H "Authorization: Bearer <admin-token>" \
     http://localhost:3000/admin/circuit-breaker/reset/auth
```

## تنظیمات پیشرفته

### Circuit Breaker

```javascript
// تنظیمات پیش‌فرض
{
  failureThreshold: 5,      // حداکثر خطا قبل از باز شدن
  recoveryTimeout: 60000,   // زمان انتظار برای بازیابی (۶۰ ثانیه)
  successThreshold: 3       // تعداد موفقیت برای بستن مجدد
}
```

### Service Discovery

```javascript
// تنظیمات Health Check
{
  healthCheckInterval: 30000,  // ۳۰ ثانیه
  healthCheckTimeout: 5000     // ۵ ثانیه
}
```

### Event Bus

```javascript
// تنظیمات Retry
{
  maxRetries: 3,        // حداکثر تلاش مجدد
  retryDelay: 5000      // تاخیر بین تلاش‌ها (۵ ثانیه)
}
```

## مثال کامل

برای مشاهده مثال کامل استفاده از API Gateway، فایل `examples/serviceIntegrationExample.js` را بررسی کنید.

## لاگ‌ها

تمام عملیات API Gateway در لاگ‌ها ثبت می‌شوند:

- درخواست‌ها و پاسخ‌ها
- وضعیت Circuit Breaker ها
- Health Check نتایج
- رویدادهای Event Bus
- خطاها و هشدارها

## امنیت

- تمام endpoint های مدیریتی نیاز به احراز هویت دارند
- Rate Limiting برای جلوگیری از حملات DDoS
- CORS برای کنترل دسترسی از مرورگر
- Header های امنیتی برای محافظت از حملات
- Circuit Breaker برای جلوگیری از cascade failure

## عملکرد

- Load Balancing برای توزیع بار
- Connection pooling برای بهبود عملکرد
- Caching برای کاهش تاخیر
- Compression برای کاهش ترافیک شبکه