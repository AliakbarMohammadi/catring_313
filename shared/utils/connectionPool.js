import { sequelize, createRedisConnection } from '../config/database.js';
import { createLogger } from './logger.js';

const logger = createLogger('connection-pool');

/**
 * مدیریت Connection Pool برای دیتابیس و Redis
 */
class ConnectionPoolManager {
  constructor() {
    this.sequelize = sequelize;
    this.redis = null;
    this.isInitialized = false;
    this.healthCheckInterval = null;
  }

  /**
   * راه‌اندازی اتصالات
   */
  async initialize() {
    try {
      logger.info('🔄 شروع راه‌اندازی Connection Pool...');

      // تست اتصال PostgreSQL
      await this.sequelize.authenticate();
      logger.info('✅ اتصال PostgreSQL برقرار شد');

      // راه‌اندازی Redis
      this.redis = await createRedisConnection();
      logger.info('✅ اتصال Redis برقرار شد');

      // شروع Health Check
      this.startHealthCheck();

      this.isInitialized = true;
      logger.info('✅ Connection Pool با موفقیت راه‌اندازی شد');

      return true;
    } catch (error) {
      logger.error('❌ خطا در راه‌اندازی Connection Pool', { error: error.message });
      throw error;
    }
  }

  /**
   * بستن تمام اتصالات
   */
  async close() {
    try {
      logger.info('🔄 بستن Connection Pool...');

      // توقف Health Check
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // بستن Redis
      if (this.redis) {
        await this.redis.quit();
        this.redis = null;
        logger.info('🔌 اتصال Redis بسته شد');
      }

      // بستن Sequelize
      await this.sequelize.close();
      logger.info('🔌 اتصال PostgreSQL بسته شد');

      this.isInitialized = false;
      logger.info('✅ Connection Pool بسته شد');

      return true;
    } catch (error) {
      logger.error('❌ خطا در بستن Connection Pool', { error: error.message });
      throw error;
    }
  }

  /**
   * شروع Health Check دوره‌ای
   */
  startHealthCheck() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('❌ خطا در Health Check', { error: error.message });
      }
    }, 30000); // هر 30 ثانیه

    logger.info('🔄 Health Check شروع شد');
  }

  /**
   * انجام Health Check
   */
  async performHealthCheck() {
    const results = {
      postgres: false,
      redis: false,
      timestamp: new Date().toISOString()
    };

    try {
      // بررسی PostgreSQL
      await this.sequelize.authenticate();
      results.postgres = true;
    } catch (error) {
      logger.warn('⚠️ مشکل در اتصال PostgreSQL', { error: error.message });
    }

    try {
      // بررسی Redis
      if (this.redis) {
        await this.redis.ping();
        results.redis = true;
      }
    } catch (error) {
      logger.warn('⚠️ مشکل در اتصال Redis', { error: error.message });
    }

    // لاگ نتایج
    if (results.postgres && results.redis) {
      logger.debug('✅ Health Check موفق - تمام اتصالات سالم هستند');
    } else {
      logger.warn('⚠️ Health Check ناموفق', results);
    }

    return results;
  }

  /**
   * دریافت آمار Connection Pool
   */
  getPoolStats() {
    const sequelizePool = this.sequelize.connectionManager.pool;
    
    return {
      postgres: {
        total: sequelizePool?.options?.max || 0,
        used: sequelizePool?.used?.length || 0,
        waiting: sequelizePool?.pending?.length || 0,
        idle: sequelizePool?.available?.length || 0
      },
      redis: {
        status: this.redis?.status || 'disconnected',
        connected: this.redis?.status === 'ready'
      },
      health_check_active: !!this.healthCheckInterval,
      initialized: this.isInitialized
    };
  }

  /**
   * دریافت اتصال Redis
   */
  getRedisConnection() {
    if (!this.redis) {
      throw new Error('Redis connection not initialized');
    }
    return this.redis;
  }

  /**
   * دریافت اتصال Sequelize
   */
  getSequelizeConnection() {
    return this.sequelize;
  }

  /**
   * بررسی وضعیت اتصالات
   */
  isHealthy() {
    return this.isInitialized && 
           this.sequelize && 
           this.redis && 
           this.redis.status === 'ready';
  }

  /**
   * اجرای تراکنش دیتابیس
   * @param {Function} callback - تابع تراکنش
   * @param {Object} options - تنظیمات تراکنش
   */
  async executeTransaction(callback, options = {}) {
    const transaction = await this.sequelize.transaction(options);
    
    try {
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * اجرای عملیات Redis با retry
   * @param {Function} operation - عملیات Redis
   * @param {number} maxRetries - حداکثر تعداد تلاش
   */
  async executeRedisOperation(operation, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation(this.redis);
      } catch (error) {
        lastError = error;
        logger.warn(`تلاش ${attempt} برای عملیات Redis ناموفق`, { error: error.message });
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    throw lastError;
  }
}

// ایجاد instance واحد
const connectionPool = new ConnectionPoolManager();

export default connectionPool;
export { ConnectionPoolManager };