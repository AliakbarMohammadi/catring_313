/**
 * مثال استفاده از Service Client و Event Handler در سرویس‌ها
 * این فایل نمونه‌ای از نحوه پیاده‌سازی ارتباط بین سرویس‌ها است
 */

import express from 'express';
import { createServiceClient } from '../../../shared/utils/serviceClient.js';
import { createEventHandler, SystemEvents, eventMiddleware } from '../../../shared/utils/eventHandler.js';
import { createLogger } from '@tadbir-khowan/shared';

const logger = createLogger('service-integration-example');

// ایجاد Service Client
const serviceClient = createServiceClient({
  serviceName: 'example-service',
  gatewayUrl: 'http://localhost:3000'
});

// ایجاد Event Handler
const eventHandler = createEventHandler('example-service');

// مثال 1: استفاده از Service Client برای فراخوانی سرویس‌های دیگر
async function exampleServiceCalls() {
  try {
    // فراخوانی سرویس کاربران
    const userService = await serviceClient.users();
    const user = await userService.getUser('user123');
    logger.info('اطلاعات کاربر دریافت شد', { userId: user.id });

    // فراخوانی سرویس منو
    const menuService = await serviceClient.menu();
    const dailyMenu = await menuService.getDailyMenu('2024-01-15');
    logger.info('منوی روزانه دریافت شد', { itemCount: dailyMenu.items.length });

    // فراخوانی سرویس سفارشات
    const orderService = await serviceClient.orders();
    const orders = await orderService.getUserOrders('user123', {
      status: 'confirmed',
      limit: 10
    });
    logger.info('سفارشات کاربر دریافت شد', { orderCount: orders.length });

  } catch (error) {
    logger.error('خطا در فراخوانی سرویس‌ها', { error: error.message });
  }
}

// مثال 2: استفاده از Event Handler برای مدیریت رویدادها
function setupEventHandlers() {
  // Handler برای رویداد ثبت‌نام کاربر جدید
  eventHandler.on(SystemEvents.USER_REGISTERED, async (userData, event) => {
    logger.info('کاربر جدید ثبت‌نام کرد', {
      userId: userData.id,
      email: userData.email,
      eventId: event.id
    });

    try {
      // ارسال ایمیل خوش‌آمدگویی
      const notificationService = await serviceClient.notifications();
      await notificationService.sendNotification({
        userId: userData.id,
        type: 'welcome_email',
        data: {
          userName: userData.name,
          email: userData.email
        }
      });

      logger.info('ایمیل خوش‌آمدگویی ارسال شد', { userId: userData.id });
    } catch (error) {
      logger.error('خطا در ارسال ایمیل خوش‌آمدگویی', {
        error: error.message,
        userId: userData.id
      });
    }
  });

  // Handler برای رویداد تایید سفارش
  eventHandler.on(SystemEvents.ORDER_CONFIRMED, async (orderData, event) => {
    logger.info('سفارش تایید شد', {
      orderId: orderData.id,
      userId: orderData.userId,
      eventId: event.id
    });

    try {
      // به‌روزرسانی موجودی
      const menuService = await serviceClient.menu();
      for (const item of orderData.items) {
        await menuService.updateInventory(item.foodItemId, -item.quantity);
      }

      // ارسال اعلان تایید سفارش
      const notificationService = await serviceClient.notifications();
      await notificationService.sendNotification({
        userId: orderData.userId,
        type: 'order_confirmed',
        data: {
          orderId: orderData.id,
          totalAmount: orderData.totalAmount,
          deliveryDate: orderData.deliveryDate
        }
      });

      logger.info('موجودی به‌روزرسانی شد و اعلان ارسال شد', {
        orderId: orderData.id
      });
    } catch (error) {
      logger.error('خطا در پردازش تایید سفارش', {
        error: error.message,
        orderId: orderData.id
      });
    }
  });

  // Handler برای رویداد پرداخت موفق
  eventHandler.on(SystemEvents.PAYMENT_COMPLETED, async (paymentData, event) => {
    logger.info('پرداخت تکمیل شد', {
      paymentId: paymentData.id,
      orderId: paymentData.orderId,
      amount: paymentData.amount,
      eventId: event.id
    });

    try {
      // به‌روزرسانی وضعیت سفارش
      const orderService = await serviceClient.orders();
      await orderService.updateOrderStatus(paymentData.orderId, 'paid');

      // تولید فاکتور
      const paymentService = await serviceClient.payments();
      const invoice = await paymentService.generateInvoice(paymentData.orderId);

      // ارسال فاکتور به کاربر
      const notificationService = await serviceClient.notifications();
      await notificationService.sendNotification({
        userId: paymentData.userId,
        type: 'invoice_ready',
        data: {
          orderId: paymentData.orderId,
          invoiceId: invoice.id,
          downloadUrl: invoice.downloadUrl
        }
      });

      logger.info('فاکتور تولید و ارسال شد', {
        orderId: paymentData.orderId,
        invoiceId: invoice.id
      });
    } catch (error) {
      logger.error('خطا در پردازش پرداخت موفق', {
        error: error.message,
        paymentId: paymentData.id
      });
    }
  });
}

// مثال 3: انتشار رویداد
async function publishExampleEvent() {
  try {
    const eventId = await eventHandler.emit(SystemEvents.SERVICE_STARTED, {
      serviceName: 'example-service',
      version: '1.0.0',
      startTime: new Date().toISOString(),
      features: ['service-calls', 'event-handling', 'health-check']
    });

    logger.info('رویداد شروع سرویس منتشر شد', { eventId });
  } catch (error) {
    logger.error('خطا در انتشار رویداد', { error: error.message });
  }
}

// مثال 4: اشتراک در رویدادها
async function subscribeToEvents() {
  try {
    // اشتراک در رویدادهای مختلف
    await eventHandler.subscribe(SystemEvents.USER_REGISTERED, '/events/user-registered');
    await eventHandler.subscribe(SystemEvents.ORDER_CONFIRMED, '/events/order-confirmed');
    await eventHandler.subscribe(SystemEvents.PAYMENT_COMPLETED, '/events/payment-completed');

    logger.info('اشتراک در رویدادها موفق بود');
  } catch (error) {
    logger.error('خطا در اشتراک رویدادها', { error: error.message });
  }
}

// مثال 5: راه‌اندازی سرور Express با پشتیبانی از رویدادها
function createExampleServer() {
  const app = express();
  
  app.use(express.json());
  
  // اضافه کردن میدل‌ویر رویداد
  app.use(eventMiddleware(eventHandler));

  // endpoint برای دریافت رویدادهای کاربر
  app.post('/events/user-registered', (req, res) => {
    // این endpoint توسط eventMiddleware پردازش می‌شود
    res.json({ message: 'Event received' });
  });

  // endpoint برای دریافت رویدادهای سفارش
  app.post('/events/order-confirmed', (req, res) => {
    res.json({ message: 'Event received' });
  });

  // endpoint برای دریافت رویدادهای پرداخت
  app.post('/events/payment-completed', (req, res) => {
    res.json({ message: 'Event received' });
  });

  // endpoint برای تست فراخوانی سرویس‌ها
  app.get('/test/service-calls', async (req, res) => {
    try {
      await exampleServiceCalls();
      res.json({ message: 'Service calls completed successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // endpoint برای تست انتشار رویداد
  app.post('/test/publish-event', async (req, res) => {
    try {
      await publishExampleEvent();
      res.json({ message: 'Event published successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // endpoint برای نمایش وضعیت اشتراک‌ها
  app.get('/status/subscriptions', (req, res) => {
    res.json({
      subscriptions: eventHandler.getSubscriptions(),
      handlers: eventHandler.getHandlers()
    });
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'example-service',
      timestamp: new Date().toISOString()
    });
  });

  return app;
}

// مثال 6: راه‌اندازی کامل سرویس
async function startExampleService() {
  try {
    // راه‌اندازی Event Handler ها
    setupEventHandlers();

    // اشتراک در رویدادها
    await subscribeToEvents();

    // انتشار رویداد شروع سرویس
    await publishExampleEvent();

    // راه‌اندازی سرور
    const app = createExampleServer();
    const PORT = process.env.PORT || 3010;

    app.listen(PORT, () => {
      logger.info(`🚀 Example Service در حال اجرا روی پورت ${PORT}`);
      logger.info('✅ Service Client و Event Handler راه‌اندازی شدند');
    });

  } catch (error) {
    logger.error('خطا در راه‌اندازی سرویس', { error: error.message });
    process.exit(1);
  }
}

// اجرای مثال (فقط اگر این فایل مستقیماً اجرا شود)
if (import.meta.url === `file://${process.argv[1]}`) {
  startExampleService();
}

export {
  exampleServiceCalls,
  setupEventHandlers,
  publishExampleEvent,
  subscribeToEvents,
  createExampleServer,
  startExampleService
};