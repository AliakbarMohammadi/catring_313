import { EventEmitter } from 'events';
import { createLogger } from '@tadbir-khowan/shared';
import { serviceClient } from './serviceClient.js';

const logger = createLogger('event-bus');

/**
 * کلاس Event Bus برای ارتباط async بین سرویس‌ها
 */
export class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // افزایش حداکثر listener ها
    this.eventHistory = new Map(); // تاریخچه رویدادها
    this.subscribers = new Map(); // مشترکین رویدادها
    this.retryQueue = new Map(); // صف retry برای رویدادهای ناموفق
    this.maxRetries = 3;
    this.retryDelay = 5000; // ۵ ثانیه
  }

  /**
   * انتشار رویداد
   * @param {string} eventType - نوع رویداد
   * @param {Object} eventData - داده‌های رویداد
   * @param {Object} options - تنظیمات اضافی
   */
  async publish(eventType, eventData, options = {}) {
    const eventId = this.generateEventId();
    const timestamp = new Date().toISOString();
    
    const event = {
      id: eventId,
      type: eventType,
      data: eventData,
      timestamp,
      source: options.source || 'api-gateway',
      correlationId: options.correlationId || eventId,
      metadata: options.metadata || {}
    };

    logger.info(`انتشار رویداد ${eventType}`, {
      eventId,
      source: event.source,
      correlationId: event.correlationId
    });

    // ذخیره در تاریخچه
    this.eventHistory.set(eventId, event);

    // انتشار محلی
    this.emit(eventType, event);

    // ارسال به سرویس‌های مشترک
    await this.notifySubscribers(event);

    return eventId;
  }

  /**
   * اشتراک در رویداد
   * @param {string} eventType - نوع رویداد
   * @param {Function} handler - تابع مدیریت رویداد
   * @param {Object} options - تنظیمات اضافی
   */
  subscribe(eventType, handler, options = {}) {
    const subscriberId = this.generateSubscriberId();
    
    const subscription = {
      id: subscriberId,
      eventType,
      handler,
      serviceName: options.serviceName,
      endpoint: options.endpoint,
      isLocal: !options.serviceName, // اگر serviceName نداشته باشد، محلی است
      createdAt: new Date().toISOString()
    };

    // اضافه کردن به فهرست مشترکین
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Map());
    }
    this.subscribers.get(eventType).set(subscriberId, subscription);

    // اگر محلی است، listener اضافه کن
    if (subscription.isLocal) {
      this.on(eventType, handler);
    }

    logger.info(`اشتراک جدید در رویداد ${eventType}`, {
      subscriberId,
      serviceName: options.serviceName || 'local',
      endpoint: options.endpoint
    });

    return subscriberId;
  }

  /**
   * لغو اشتراک
   * @param {string} subscriberId - شناسه مشترک
   */
  unsubscribe(subscriberId) {
    for (const [eventType, subscribers] of this.subscribers.entries()) {
      if (subscribers.has(subscriberId)) {
        const subscription = subscribers.get(subscriberId);
        
        // حذف listener محلی
        if (subscription.isLocal) {
          this.removeListener(eventType, subscription.handler);
        }
        
        subscribers.delete(subscriberId);
        
        logger.info(`لغو اشتراک ${subscriberId} از رویداد ${eventType}`);
        return true;
      }
    }
    
    return false;
  }

  /**
   * اطلاع‌رسانی به مشترکین خارجی
   * @param {Object} event - رویداد
   */
  async notifySubscribers(event) {
    const subscribers = this.subscribers.get(event.type);
    if (!subscribers) return;

    const notifications = [];
    
    for (const [subscriberId, subscription] of subscribers.entries()) {
      // فقط مشترکین خارجی
      if (!subscription.isLocal && subscription.serviceName && subscription.endpoint) {
        notifications.push(
          this.notifyExternalSubscriber(event, subscription, subscriberId)
        );
      }
    }

    if (notifications.length > 0) {
      await Promise.allSettled(notifications);
    }
  }

  /**
   * اطلاع‌رسانی به مشترک خارجی
   * @param {Object} event - رویداد
   * @param {Object} subscription - اطلاعات اشتراک
   * @param {string} subscriberId - شناسه مشترک
   */
  async notifyExternalSubscriber(event, subscription, subscriberId) {
    try {
      logger.debug(`ارسال رویداد ${event.type} به ${subscription.serviceName}`, {
        eventId: event.id,
        subscriberId,
        endpoint: subscription.endpoint
      });

      await serviceClient.post(
        subscription.serviceName,
        subscription.endpoint,
        {
          event: event,
          subscription: {
            id: subscriberId,
            eventType: subscription.eventType
          }
        },
        {
          headers: {
            'X-Event-Type': event.type,
            'X-Event-Id': event.id,
            'X-Correlation-Id': event.correlationId
          }
        }
      );

      logger.debug(`رویداد ${event.type} با موفقیت به ${subscription.serviceName} ارسال شد`);

    } catch (error) {
      logger.error(`خطا در ارسال رویداد ${event.type} به ${subscription.serviceName}`, {
        error: error.message,
        eventId: event.id,
        subscriberId
      });

      // اضافه کردن به صف retry
      await this.addToRetryQueue(event, subscription, subscriberId);
    }
  }

  /**
   * اضافه کردن به صف retry
   * @param {Object} event - رویداد
   * @param {Object} subscription - اطلاعات اشتراک
   * @param {string} subscriberId - شناسه مشترک
   */
  async addToRetryQueue(event, subscription, subscriberId) {
    const retryKey = `${event.id}-${subscriberId}`;
    
    if (!this.retryQueue.has(retryKey)) {
      this.retryQueue.set(retryKey, {
        event,
        subscription,
        subscriberId,
        attempts: 0,
        nextRetry: Date.now() + this.retryDelay
      });

      logger.info(`رویداد ${event.type} به صف retry اضافه شد`, {
        eventId: event.id,
        subscriberId,
        retryKey
      });
    }
  }

  /**
   * پردازش صف retry
   */
  async processRetryQueue() {
    const now = Date.now();
    const toRetry = [];

    for (const [retryKey, retryItem] of this.retryQueue.entries()) {
      if (now >= retryItem.nextRetry && retryItem.attempts < this.maxRetries) {
        toRetry.push({ retryKey, retryItem });
      } else if (retryItem.attempts >= this.maxRetries) {
        // حذف از صف پس از حداکثر تلاش
        this.retryQueue.delete(retryKey);
        logger.warn(`رویداد ${retryItem.event.type} پس از ${this.maxRetries} تلاش حذف شد`, {
          eventId: retryItem.event.id,
          subscriberId: retryItem.subscriberId
        });
      }
    }

    // پردازش موارد retry
    for (const { retryKey, retryItem } of toRetry) {
      retryItem.attempts++;
      retryItem.nextRetry = now + (this.retryDelay * retryItem.attempts);

      try {
        await this.notifyExternalSubscriber(
          retryItem.event,
          retryItem.subscription,
          retryItem.subscriberId
        );

        // حذف از صف در صورت موفقیت
        this.retryQueue.delete(retryKey);
        
      } catch (error) {
        logger.warn(`تلاش مجدد ${retryItem.attempts} برای رویداد ${retryItem.event.type} شکست خورد`, {
          error: error.message,
          eventId: retryItem.event.id
        });
      }
    }
  }

  /**
   * شروع پردازش دوره‌ای صف retry
   */
  startRetryProcessor() {
    if (this.retryProcessor) {
      return; // قبلاً شروع شده
    }

    this.retryProcessor = setInterval(() => {
      this.processRetryQueue();
    }, this.retryDelay);

    logger.info('پردازشگر retry شروع شد');
  }

  /**
   * توقف پردازش دوره‌ای صف retry
   */
  stopRetryProcessor() {
    if (this.retryProcessor) {
      clearInterval(this.retryProcessor);
      this.retryProcessor = null;
      logger.info('پردازشگر retry متوقف شد');
    }
  }

  /**
   * دریافت تاریخچه رویدادها
   * @param {Object} filters - فیلترهای جستجو
   * @returns {Array} - آرایه‌ای از رویدادها
   */
  getEventHistory(filters = {}) {
    let events = Array.from(this.eventHistory.values());

    // اعمال فیلترها
    if (filters.eventType) {
      events = events.filter(event => event.type === filters.eventType);
    }

    if (filters.source) {
      events = events.filter(event => event.source === filters.source);
    }

    if (filters.correlationId) {
      events = events.filter(event => event.correlationId === filters.correlationId);
    }

    if (filters.fromDate) {
      const fromDate = new Date(filters.fromDate);
      events = events.filter(event => new Date(event.timestamp) >= fromDate);
    }

    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      events = events.filter(event => new Date(event.timestamp) <= toDate);
    }

    // مرتب‌سازی بر اساس زمان (جدیدترین اول)
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // محدود کردن تعداد نتایج
    if (filters.limit) {
      events = events.slice(0, filters.limit);
    }

    return events;
  }

  /**
   * دریافت آمار Event Bus
   * @returns {Object} - آمار Event Bus
   */
  getStats() {
    const eventTypes = new Map();
    const sources = new Map();

    for (const event of this.eventHistory.values()) {
      // شمارش انواع رویداد
      eventTypes.set(event.type, (eventTypes.get(event.type) || 0) + 1);
      
      // شمارش منابع
      sources.set(event.source, (sources.get(event.source) || 0) + 1);
    }

    return {
      totalEvents: this.eventHistory.size,
      totalSubscribers: Array.from(this.subscribers.values())
        .reduce((total, subs) => total + subs.size, 0),
      retryQueueSize: this.retryQueue.size,
      eventTypes: Object.fromEntries(eventTypes),
      sources: Object.fromEntries(sources),
      uptime: process.uptime()
    };
  }

  /**
   * تولید شناسه رویداد
   * @returns {string} - شناسه یکتا
   */
  generateEventId() {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * تولید شناسه مشترک
   * @returns {string} - شناسه یکتا
   */
  generateSubscriberId() {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * پاک‌سازی تاریخچه قدیمی
   * @param {number} maxAge - حداکثر سن رویداد به میلی‌ثانیه
   */
  cleanupHistory(maxAge = 24 * 60 * 60 * 1000) { // ۲۴ ساعت
    const cutoffTime = Date.now() - maxAge;
    let cleanedCount = 0;

    for (const [eventId, event] of this.eventHistory.entries()) {
      if (new Date(event.timestamp).getTime() < cutoffTime) {
        this.eventHistory.delete(eventId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`${cleanedCount} رویداد قدیمی از تاریخچه پاک شد`);
    }
  }
}

// نمونه singleton
export const eventBus = new EventBus();

// شروع پردازشگر retry
eventBus.startRetryProcessor();

// پاک‌سازی دوره‌ای تاریخچه (هر ساعت)
setInterval(() => {
  eventBus.cleanupHistory();
}, 60 * 60 * 1000);

/**
 * میدل‌ویر برای اضافه کردن Event Bus به درخواست
 */
export const eventBusMiddleware = (req, res, next) => {
  req.eventBus = eventBus;
  next();
};