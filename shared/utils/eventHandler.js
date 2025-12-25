import { createLogger } from './logger.js';
import { serviceClient } from './serviceClient.js';

const logger = createLogger('event-handler');

/**
 * کلاس Event Handler برای مدیریت رویدادها در سرویس‌ها
 */
export class EventHandler {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.subscriptions = new Map();
    this.eventHandlers = new Map();
  }

  /**
   * ثبت handler برای نوع رویداد خاص
   * @param {string} eventType - نوع رویداد
   * @param {Function} handler - تابع مدیریت رویداد
   */
  on(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    
    this.eventHandlers.get(eventType).push(handler);
    
    logger.info(`Handler برای رویداد ${eventType} ثبت شد`, {
      serviceName: this.serviceName
    });
  }

  /**
   * حذف handler برای نوع رویداد
   * @param {string} eventType - نوع رویداد
   * @param {Function} handler - تابع مدیریت رویداد
   */
  off(eventType, handler) {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        logger.info(`Handler برای رویداد ${eventType} حذف شد`);
      }
    }
  }

  /**
   * اشتراک در رویداد از طریق API Gateway
   * @param {string} eventType - نوع رویداد
   * @param {string} endpoint - endpoint محلی برای دریافت رویداد
   */
  async subscribe(eventType, endpoint) {
    try {
      const subscriberId = await serviceClient.subscribeToEvent(eventType, endpoint);
      
      this.subscriptions.set(eventType, {
        subscriberId,
        endpoint,
        subscribedAt: new Date().toISOString()
      });

      logger.info(`اشتراک در رویداد ${eventType} موفق بود`, {
        subscriberId,
        endpoint
      });

      return subscriberId;
    } catch (error) {
      logger.error(`خطا در اشتراک رویداد ${eventType}`, {
        error: error.message,
        endpoint
      });
      throw error;
    }
  }

  /**
   * لغو اشتراک از رویداد
   * @param {string} eventType - نوع رویداد
   */
  async unsubscribe(eventType) {
    const subscription = this.subscriptions.get(eventType);
    if (!subscription) {
      logger.warn(`اشتراک برای رویداد ${eventType} یافت نشد`);
      return false;
    }

    try {
      const success = await serviceClient.unsubscribeFromEvent(subscription.subscriberId);
      
      if (success) {
        this.subscriptions.delete(eventType);
        logger.info(`لغو اشتراک از رویداد ${eventType} موفق بود`);
      }

      return success;
    } catch (error) {
      logger.error(`خطا در لغو اشتراک رویداد ${eventType}`, {
        error: error.message
      });
      return false;
    }
  }

  /**
   * انتشار رویداد
   * @param {string} eventType - نوع رویداد
   * @param {Object} eventData - داده‌های رویداد
   * @param {Object} options - تنظیمات اضافی
   */
  async emit(eventType, eventData, options = {}) {
    try {
      const eventId = await serviceClient.publishEvent(eventType, eventData, {
        ...options,
        source: this.serviceName
      });

      logger.info(`رویداد ${eventType} منتشر شد`, {
        eventId,
        serviceName: this.serviceName
      });

      return eventId;
    } catch (error) {
      logger.error(`خطا در انتشار رویداد ${eventType}`, {
        error: error.message,
        eventData
      });
      throw error;
    }
  }

  /**
   * پردازش رویداد دریافتی
   * @param {Object} eventData - داده‌های رویداد دریافتی
   */
  async handleIncomingEvent(eventData) {
    const { event, subscription } = eventData;
    
    logger.info(`دریافت رویداد ${event.type}`, {
      eventId: event.id,
      source: event.source,
      correlationId: event.correlationId
    });

    const handlers = this.eventHandlers.get(event.type);
    if (!handlers || handlers.length === 0) {
      logger.warn(`هیچ handler برای رویداد ${event.type} یافت نشد`);
      return;
    }

    // اجرای همه handler ها
    const promises = handlers.map(async (handler) => {
      try {
        await handler(event.data, event);
        logger.debug(`Handler برای رویداد ${event.type} با موفقیت اجرا شد`);
      } catch (error) {
        logger.error(`خطا در اجرای handler برای رویداد ${event.type}`, {
          error: error.message,
          eventId: event.id
        });
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * دریافت فهرست اشتراک‌ها
   */
  getSubscriptions() {
    return Object.fromEntries(this.subscriptions);
  }

  /**
   * دریافت فهرست handler ها
   */
  getHandlers() {
    const handlers = {};
    for (const [eventType, handlerList] of this.eventHandlers.entries()) {
      handlers[eventType] = handlerList.length;
    }
    return handlers;
  }
}

/**
 * رویدادهای استاندارد سیستم
 */
export const SystemEvents = {
  // رویدادهای کاربر
  USER_REGISTERED: 'user.registered',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  
  // رویدادهای شرکت
  COMPANY_REGISTERED: 'company.registered',
  COMPANY_APPROVED: 'company.approved',
  COMPANY_REJECTED: 'company.rejected',
  
  // رویدادهای کارمند
  EMPLOYEE_ADDED: 'employee.added',
  EMPLOYEE_REMOVED: 'employee.removed',
  
  // رویدادهای منو
  MENU_PUBLISHED: 'menu.published',
  MENU_UPDATED: 'menu.updated',
  FOOD_ITEM_OUT_OF_STOCK: 'food_item.out_of_stock',
  
  // رویدادهای سفارش
  ORDER_CREATED: 'order.created',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_COMPLETED: 'order.completed',
  ORDER_STATUS_CHANGED: 'order.status_changed',
  
  // رویدادهای پرداخت
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  INVOICE_GENERATED: 'invoice.generated',
  
  // رویدادهای اعلان
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_FAILED: 'notification.failed',
  
  // رویدادهای سیستم
  SERVICE_STARTED: 'service.started',
  SERVICE_STOPPED: 'service.stopped',
  HEALTH_CHECK_FAILED: 'health_check.failed'
};

/**
 * ایجاد Event Handler برای سرویس
 * @param {string} serviceName - نام سرویس
 * @returns {EventHandler} - نمونه Event Handler
 */
export const createEventHandler = (serviceName) => {
  return new EventHandler(serviceName);
};

/**
 * میدل‌ویر Express برای پردازش رویدادهای دریافتی
 * @param {EventHandler} eventHandler - نمونه Event Handler
 */
export const eventMiddleware = (eventHandler) => {
  return async (req, res, next) => {
    // بررسی اینکه آیا این درخواست رویداد است
    if (req.headers['x-event-type'] && req.headers['x-event-id']) {
      try {
        await eventHandler.handleIncomingEvent(req.body);
        
        res.json({
          message: 'رویداد با موفقیت پردازش شد',
          eventId: req.headers['x-event-id'],
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('خطا در پردازش رویداد دریافتی', {
          error: error.message,
          eventId: req.headers['x-event-id']
        });
        
        res.status(500).json({
          error: {
            code: 'EVENT_PROCESSING_FAILED',
            message: 'خطا در پردازش رویداد',
            timestamp: new Date().toISOString()
          }
        });
      }
    } else {
      next();
    }
  };
};