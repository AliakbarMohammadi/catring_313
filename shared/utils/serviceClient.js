import { createLogger } from './logger.js';

const logger = createLogger('service-client');

/**
 * کلاس Service Client برای استفاده در سرویس‌ها
 * این کلاس برای ارتباط با سرویس‌های دیگر از طریق API Gateway استفاده می‌شود
 */
export class ServiceClient {
  constructor(options = {}) {
    this.gatewayUrl = options.gatewayUrl || process.env.API_GATEWAY_URL || 'http://localhost:3000';
    this.serviceName = options.serviceName || process.env.SERVICE_NAME || 'unknown';
    this.timeout = options.timeout || 10000;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': `${this.serviceName}-client/1.0`,
      ...options.headers
    };
  }

  /**
   * ارسال درخواست HTTP
   * @param {string} method - متد HTTP
   * @param {string} path - مسیر API
   * @param {Object} options - تنظیمات درخواست
   * @returns {Promise<Object>} - پاسخ سرویس
   */
  async request(method, path, options = {}) {
    const headers = { ...this.defaultHeaders, ...options.headers };
    const body = options.body ? JSON.stringify(options.body) : undefined;
    const url = `${this.gatewayUrl}${path}`;

    let lastError;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        logger.debug(`درخواست ${method} به ${path}`, {
          url,
          attempt,
          headers: this.sanitizeHeaders(headers)
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method,
          headers,
          body,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          const error = new Error(`HTTP ${response.status}: ${errorText}`);
          error.status = response.status;
          error.response = response;
          throw error;
        }

        const responseData = await response.json();

        logger.debug(`پاسخ موفق از ${path}`, {
          status: response.status,
          attempt
        });

        return {
          data: responseData,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries())
        };

      } catch (error) {
        lastError = error;

        logger.warn(`خطا در درخواست به ${path}`, {
          error: error.message,
          attempt,
          willRetry: attempt < this.retryAttempts
        });

        if (attempt === this.retryAttempts) {
          break;
        }

        await this.delay(this.retryDelay * attempt);
      }
    }

    logger.error(`تمام تلاش‌ها برای ${path} شکست خورد`, {
      error: lastError.message,
      attempts: this.retryAttempts
    });

    throw lastError;
  }

  /**
   * درخواست GET
   */
  async get(path, options = {}) {
    return this.request('GET', path, options);
  }

  /**
   * درخواست POST
   */
  async post(path, data, options = {}) {
    return this.request('POST', path, { ...options, body: data });
  }

  /**
   * درخواست PUT
   */
  async put(path, data, options = {}) {
    return this.request('PUT', path, { ...options, body: data });
  }

  /**
   * درخواست DELETE
   */
  async delete(path, options = {}) {
    return this.request('DELETE', path, options);
  }

  /**
   * درخواست PATCH
   */
  async patch(path, data, options = {}) {
    return this.request('PATCH', path, { ...options, body: data });
  }

  /**
   * انتشار رویداد از طریق Event Bus
   * @param {string} eventType - نوع رویداد
   * @param {Object} eventData - داده‌های رویداد
   * @param {Object} options - تنظیمات اضافی
   * @returns {Promise<string>} - شناسه رویداد
   */
  async publishEvent(eventType, eventData, options = {}) {
    try {
      const response = await this.post('/internal/events/publish', {
        eventType,
        eventData,
        options: {
          ...options,
          source: this.serviceName
        }
      }, {
        headers: {
          'X-Service-Name': this.serviceName
        }
      });

      return response.data.eventId;
    } catch (error) {
      logger.error('خطا در انتشار رویداد', {
        eventType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * اشتراک در رویداد
   * @param {string} eventType - نوع رویداد
   * @param {string} endpoint - endpoint برای دریافت رویداد
   * @returns {Promise<string>} - شناسه اشتراک
   */
  async subscribeToEvent(eventType, endpoint) {
    try {
      const response = await this.post('/internal/events/subscribe', {
        eventType,
        serviceName: this.serviceName,
        endpoint
      }, {
        headers: {
          'X-Service-Name': this.serviceName
        }
      });

      return response.data.subscriberId;
    } catch (error) {
      logger.error('خطا در اشتراک رویداد', {
        eventType,
        endpoint,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * لغو اشتراک رویداد
   * @param {string} subscriberId - شناسه اشتراک
   * @returns {Promise<boolean>} - موفقیت عملیات
   */
  async unsubscribeFromEvent(subscriberId) {
    try {
      await this.delete(`/internal/events/subscribe/${subscriberId}`, {
        headers: {
          'X-Service-Name': this.serviceName
        }
      });

      return true;
    } catch (error) {
      logger.error('خطا در لغو اشتراک رویداد', {
        subscriberId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * فراخوانی سرویس احراز هویت
   */
  async auth() {
    return {
      validateToken: async (token) => {
        const response = await this.post('/api/auth/validate', { token });
        return response.data;
      },
      
      getUserInfo: async (userId) => {
        const response = await this.get(`/api/auth/user/${userId}`);
        return response.data;
      }
    };
  }

  /**
   * فراخوانی سرویس مدیریت کاربران
   */
  async users() {
    return {
      getUser: async (userId) => {
        const response = await this.get(`/api/users/${userId}`);
        return response.data;
      },

      updateUser: async (userId, userData) => {
        const response = await this.put(`/api/users/${userId}`, userData);
        return response.data;
      },

      getCompanyEmployees: async (companyId) => {
        const response = await this.get(`/api/users/company/${companyId}/employees`);
        return response.data;
      }
    };
  }

  /**
   * فراخوانی سرویس مدیریت منو
   */
  async menu() {
    return {
      getDailyMenu: async (date) => {
        const response = await this.get(`/api/menu/daily/${date}`);
        return response.data;
      },

      getFoodItem: async (itemId) => {
        const response = await this.get(`/api/menu/items/${itemId}`);
        return response.data;
      },

      updateInventory: async (itemId, quantity) => {
        const response = await this.patch(`/api/menu/items/${itemId}/inventory`, {
          quantity
        });
        return response.data;
      }
    };
  }

  /**
   * فراخوانی سرویس مدیریت سفارشات
   */
  async orders() {
    return {
      getOrder: async (orderId) => {
        const response = await this.get(`/api/orders/${orderId}`);
        return response.data;
      },

      updateOrderStatus: async (orderId, status) => {
        const response = await this.patch(`/api/orders/${orderId}/status`, {
          status
        });
        return response.data;
      },

      getUserOrders: async (userId, filters = {}) => {
        const queryParams = new URLSearchParams(filters).toString();
        const response = await this.get(`/api/orders/user/${userId}?${queryParams}`);
        return response.data;
      }
    };
  }

  /**
   * فراخوانی سرویس پرداخت
   */
  async payments() {
    return {
      processPayment: async (paymentData) => {
        const response = await this.post('/api/payments/process', paymentData);
        return response.data;
      },

      getPaymentStatus: async (paymentId) => {
        const response = await this.get(`/api/payments/${paymentId}/status`);
        return response.data;
      },

      generateInvoice: async (orderId) => {
        const response = await this.post(`/api/payments/invoice/${orderId}`);
        return response.data;
      }
    };
  }

  /**
   * فراخوانی سرویس اعلان‌رسانی
   */
  async notifications() {
    return {
      sendNotification: async (notificationData) => {
        const response = await this.post('/api/notifications/send', notificationData);
        return response.data;
      },

      getUserPreferences: async (userId) => {
        const response = await this.get(`/api/notifications/preferences/${userId}`);
        return response.data;
      }
    };
  }

  /**
   * فراخوانی سرویس گزارش‌گیری
   */
  async reporting() {
    return {
      getSalesReport: async (filters) => {
        const queryParams = new URLSearchParams(filters).toString();
        const response = await this.get(`/api/reporting/sales?${queryParams}`);
        return response.data;
      },

      getDashboardData: async () => {
        const response = await this.get('/api/reporting/dashboard');
        return response.data;
      }
    };
  }

  /**
   * پاک‌سازی header ها برای لاگ
   */
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * تاخیر برای retry
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * ایجاد نمونه Service Client با تنظیمات پیش‌فرض
 * @param {Object} options - تنظیمات اضافی
 * @returns {ServiceClient} - نمونه Service Client
 */
export const createServiceClient = (options = {}) => {
  return new ServiceClient(options);
};

// نمونه پیش‌فرض
export const serviceClient = createServiceClient();