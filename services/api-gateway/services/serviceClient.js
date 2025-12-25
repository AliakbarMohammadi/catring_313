import { createLogger } from '@tadbir-khowan/shared';
import { circuitBreakerManager } from '../middleware/circuitBreaker.js';
import { serviceDiscovery } from './serviceDiscovery.js';

const logger = createLogger('service-client');

/**
 * کلاس HTTP Client برای ارتباط بین سرویس‌ها
 */
export class ServiceClient {
  constructor(options = {}) {
    this.timeout = options.timeout || 10000; // ۱۰ ثانیه
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000; // ۱ ثانیه
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'API-Gateway-Service-Client/1.0',
      ...options.headers
    };
  }

  /**
   * ارسال درخواست HTTP به سرویس
   * @param {string} serviceName - نام سرویس مقصد
   * @param {string} path - مسیر API
   * @param {Object} options - تنظیمات درخواست
   * @returns {Promise<Object>} - پاسخ سرویس
   */
  async request(serviceName, path, options = {}) {
    const method = options.method || 'GET';
    const headers = { ...this.defaultHeaders, ...options.headers };
    const body = options.body ? JSON.stringify(options.body) : undefined;

    // بررسی Circuit Breaker
    const circuitBreaker = circuitBreakerManager.getBreaker(serviceName);
    if (!circuitBreaker.canExecute()) {
      const error = new Error(`Circuit breaker is open for service ${serviceName}`);
      error.code = 'CIRCUIT_BREAKER_OPEN';
      throw error;
    }

    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        // دریافت URL سرویس از Service Discovery
        const serviceUrl = this.getServiceUrl(serviceName);
        if (!serviceUrl) {
          throw new Error(`Service ${serviceName} not found or unhealthy`);
        }

        const url = `${serviceUrl}${path}`;
        
        logger.debug(`درخواست ${method} به ${serviceName}`, {
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

        // بررسی وضعیت پاسخ
        if (!response.ok) {
          const errorText = await response.text();
          const error = new Error(`HTTP ${response.status}: ${errorText}`);
          error.status = response.status;
          error.response = response;
          throw error;
        }

        // پارس کردن پاسخ JSON
        const responseData = await response.json();
        
        // ثبت موفقیت در Circuit Breaker
        circuitBreaker.recordSuccess();

        logger.debug(`پاسخ موفق از ${serviceName}`, {
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
        
        // ثبت شکست در Circuit Breaker
        circuitBreaker.recordFailure();

        logger.warn(`خطا در درخواست به ${serviceName}`, {
          error: error.message,
          attempt,
          willRetry: attempt < this.retryAttempts
        });

        // اگر آخرین تلاش بود، خطا را پرتاب کن
        if (attempt === this.retryAttempts) {
          break;
        }

        // انتظار قبل از تلاش مجدد
        await this.delay(this.retryDelay * attempt);
      }
    }

    // پرتاب آخرین خطا
    logger.error(`تمام تلاش‌ها برای ${serviceName} شکست خورد`, {
      error: lastError.message,
      attempts: this.retryAttempts
    });

    throw lastError;
  }

  /**
   * درخواست GET
   * @param {string} serviceName - نام سرویس
   * @param {string} path - مسیر API
   * @param {Object} options - تنظیمات اضافی
   * @returns {Promise<Object>} - پاسخ سرویس
   */
  async get(serviceName, path, options = {}) {
    return this.request(serviceName, path, { ...options, method: 'GET' });
  }

  /**
   * درخواست POST
   * @param {string} serviceName - نام سرویس
   * @param {string} path - مسیر API
   * @param {Object} data - داده‌های ارسالی
   * @param {Object} options - تنظیمات اضافی
   * @returns {Promise<Object>} - پاسخ سرویس
   */
  async post(serviceName, path, data, options = {}) {
    return this.request(serviceName, path, { 
      ...options, 
      method: 'POST', 
      body: data 
    });
  }

  /**
   * درخواست PUT
   * @param {string} serviceName - نام سرویس
   * @param {string} path - مسیر API
   * @param {Object} data - داده‌های ارسالی
   * @param {Object} options - تنظیمات اضافی
   * @returns {Promise<Object>} - پاسخ سرویس
   */
  async put(serviceName, path, data, options = {}) {
    return this.request(serviceName, path, { 
      ...options, 
      method: 'PUT', 
      body: data 
    });
  }

  /**
   * درخواست DELETE
   * @param {string} serviceName - نام سرویس
   * @param {string} path - مسیر API
   * @param {Object} options - تنظیمات اضافی
   * @returns {Promise<Object>} - پاسخ سرویس
   */
  async delete(serviceName, path, options = {}) {
    return this.request(serviceName, path, { ...options, method: 'DELETE' });
  }

  /**
   * درخواست PATCH
   * @param {string} serviceName - نام سرویس
   * @param {string} path - مسیر API
   * @param {Object} data - داده‌های ارسالی
   * @param {Object} options - تنظیمات اضافی
   * @returns {Promise<Object>} - پاسخ سرویس
   */
  async patch(serviceName, path, data, options = {}) {
    return this.request(serviceName, path, { 
      ...options, 
      method: 'PATCH', 
      body: data 
    });
  }

  /**
   * دریافت URL سرویس از Service Discovery
   * @param {string} serviceName - نام سرویس
   * @returns {string|null} - URL سرویس یا null
   */
  getServiceUrl(serviceName) {
    const healthyInstances = serviceDiscovery.getHealthyInstances(serviceName);
    
    if (healthyInstances.length === 0) {
      logger.warn(`هیچ نمونه سالمی برای سرویس ${serviceName} یافت نشد`);
      return null;
    }

    // انتخاب تصادفی از نمونه‌های سالم
    const randomIndex = Math.floor(Math.random() * healthyInstances.length);
    return healthyInstances[randomIndex];
  }

  /**
   * پاک‌سازی header ها برای لاگ (حذف اطلاعات حساس)
   * @param {Object} headers - header های درخواست
   * @returns {Object} - header های پاک‌سازی شده
   */
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    
    // حذف اطلاعات حساس
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
   * @param {number} ms - میلی‌ثانیه تاخیر
   * @returns {Promise} - Promise تاخیر
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * بررسی سلامت سرویس
   * @param {string} serviceName - نام سرویس
   * @returns {Promise<boolean>} - وضعیت سلامت
   */
  async healthCheck(serviceName) {
    try {
      const response = await this.get(serviceName, '/health');
      return response.status === 200;
    } catch (error) {
      logger.warn(`Health check برای ${serviceName} شکست خورد`, {
        error: error.message
      });
      return false;
    }
  }

  /**
   * ارسال درخواست batch به چندین سرویس
   * @param {Array} requests - آرایه‌ای از درخواست‌ها
   * @returns {Promise<Array>} - آرایه‌ای از پاسخ‌ها
   */
  async batchRequest(requests) {
    const promises = requests.map(async (req, index) => {
      try {
        const result = await this.request(req.serviceName, req.path, req.options);
        return { index, success: true, result };
      } catch (error) {
        return { index, success: false, error: error.message };
      }
    });

    const results = await Promise.allSettled(promises);
    
    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return { success: false, error: result.reason.message };
      }
    });
  }
}

// نمونه singleton
export const serviceClient = new ServiceClient({
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000
});

/**
 * میدل‌ویر برای اضافه کردن Service Client به درخواست
 */
export const serviceClientMiddleware = (req, res, next) => {
  req.serviceClient = serviceClient;
  next();
};