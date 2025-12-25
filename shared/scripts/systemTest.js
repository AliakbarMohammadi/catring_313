#!/usr/bin/env node

/**
 * اسکریپت تست کلی سیستم تدبیرخوان
 * تست تمام کامپوننت‌های اصلی سیستم
 */

import { createLogger } from '../utils/logger.js';
import { runTests as runModelTests } from './testModels.js';
import { testConnection } from '../config/database.js';
import connectionPool from '../utils/connectionPool.js';

const logger = createLogger('system-test');

/**
 * تست کامپوننت‌های اصلی سیستم
 */
class SystemTester {
  constructor() {
    this.results = {
      database: false,
      models: false,
      connectionPool: false,
      redis: false,
      migrations: false,
      overall: false
    };
  }

  /**
   * اجرای تمام تست‌ها
   */
  async runAllTests() {
    logger.info('🚀 شروع تست کلی سیستم تدبیرخوان...');

    try {
      // تست اتصال دیتابیس
      await this.testDatabaseConnection();

      // تست Connection Pool
      await this.testConnectionPool();

      // تست Redis
      await this.testRedis();

      // تست Migration ها
      await this.testMigrations();

      // تست مدل‌ها
      await this.testModels();

      // ارزیابی نهایی
      this.evaluateResults();

      return this.results.overall;

    } catch (error) {
      logger.error('💥 خطای غیرمنتظره در تست سیستم', { error: error.message });
      return false;
    }
  }

  /**
   * تست اتصال دیتابیس
   */
  async testDatabaseConnection() {
    logger.info('🔍 تست اتصال دیتابیس...');

    try {
      const isConnected = await testConnection();
      this.results.database = isConnected;

      if (isConnected) {
        logger.info('✅ اتصال دیتابیس موفق');
      } else {
        logger.error('❌ اتصال دیتابیس ناموفق');
      }
    } catch (error) {
      logger.error('❌ خطا در تست اتصال دیتابیس', { error: error.message });
      this.results.database = false;
    }
  }

  /**
   * تست Connection Pool
   */
  async testConnectionPool() {
    logger.info('🏊 تست Connection Pool...');

    try {
      await connectionPool.initialize();
      
      // تست Health Check
      const healthResult = await connectionPool.performHealthCheck();
      const isHealthy = healthResult.postgres && healthResult.redis;

      // دریافت آمار
      const stats = connectionPool.getPoolStats();
      logger.info('📊 آمار Connection Pool:', {
        postgres: stats.postgres,
        redis: stats.redis.status,
        initialized: stats.initialized
      });

      this.results.connectionPool = isHealthy && stats.initialized;

      if (this.results.connectionPool) {
        logger.info('✅ Connection Pool عملکرد صحیح دارد');
      } else {
        logger.error('❌ مشکل در Connection Pool');
      }
    } catch (error) {
      logger.error('❌ خطا در تست Connection Pool', { error: error.message });
      this.results.connectionPool = false;
    }
  }

  /**
   * تست Redis
   */
  async testRedis() {
    logger.info('🔴 تست Redis...');

    try {
      const redis = connectionPool.getRedisConnection();
      
      // تست عملیات پایه
      await redis.set('system-test', 'test-value');
      const value = await redis.get('system-test');
      await redis.del('system-test');

      this.results.redis = value === 'test-value';

      if (this.results.redis) {
        logger.info('✅ Redis عملکرد صحیح دارد');
      } else {
        logger.error('❌ مشکل در عملیات Redis');
      }
    } catch (error) {
      logger.error('❌ خطا در تست Redis', { error: error.message });
      this.results.redis = false;
    }
  }

  /**
   * تست Migration ها
   */
  async testMigrations() {
    logger.info('📋 تست Migration ها...');

    try {
      const { sequelize } = await import('../models/index.js');
      
      // بررسی وجود جداول اصلی
      const tables = [
        'users', 'companies', 'employees', 'food_categories', 'food_items',
        'daily_menus', 'menu_items', 'orders', 'order_items', 'payments',
        'invoices', 'notifications', 'notification_preferences',
        'audit_logs', 'security_events'
      ];

      let allTablesExist = true;
      for (const table of tables) {
        try {
          await sequelize.query(`SELECT 1 FROM ${table} LIMIT 1`);
        } catch (error) {
          logger.warn(`⚠️ جدول ${table} وجود ندارد یا قابل دسترسی نیست`);
          allTablesExist = false;
        }
      }

      this.results.migrations = allTablesExist;

      if (this.results.migrations) {
        logger.info('✅ تمام جداول موجود هستند');
      } else {
        logger.error('❌ برخی جداول موجود نیستند');
      }
    } catch (error) {
      logger.error('❌ خطا در تست Migration ها', { error: error.message });
      this.results.migrations = false;
    }
  }

  /**
   * تست مدل‌ها
   */
  async testModels() {
    logger.info('🧪 تست مدل‌ها...');

    try {
      const modelTestResult = await runModelTests();
      this.results.models = modelTestResult;

      if (this.results.models) {
        logger.info('✅ تمام مدل‌ها عملکرد صحیح دارند');
      } else {
        logger.error('❌ مشکل در عملکرد مدل‌ها');
      }
    } catch (error) {
      logger.error('❌ خطا در تست مدل‌ها', { error: error.message });
      this.results.models = false;
    }
  }

  /**
   * ارزیابی نتایج نهایی
   */
  evaluateResults() {
    const passedTests = Object.values(this.results).filter(result => result === true).length;
    const totalTests = Object.keys(this.results).length - 1; // حذف overall از شمارش

    this.results.overall = passedTests === totalTests;

    logger.info('📊 نتایج تست سیستم:', {
      database: this.results.database ? '✅' : '❌',
      connectionPool: this.results.connectionPool ? '✅' : '❌',
      redis: this.results.redis ? '✅' : '❌',
      migrations: this.results.migrations ? '✅' : '❌',
      models: this.results.models ? '✅' : '❌',
      overall: this.results.overall ? '✅ موفق' : '❌ ناموفق',
      score: `${passedTests}/${totalTests}`
    });

    if (this.results.overall) {
      logger.info('🎉 تمام تست‌های سیستم موفق بودند!');
      logger.info('✨ سیستم تدبیرخوان آماده استفاده است');
    } else {
      logger.error('⚠️ برخی تست‌های سیستم ناموفق بودند');
      logger.error('🔧 لطفاً مشکلات را برطرف کنید');
    }
  }

  /**
   * تولید گزارش تست
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      system: 'تدبیرخوان (Tadbir Khowan)',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      results: this.results,
      recommendations: this.getRecommendations()
    };

    return report;
  }

  /**
   * دریافت توصیه‌ها بر اساس نتایج تست
   */
  getRecommendations() {
    const recommendations = [];

    if (!this.results.database) {
      recommendations.push('بررسی تنظیمات اتصال PostgreSQL');
      recommendations.push('اطمینان از راه‌اندازی سرویس PostgreSQL');
    }

    if (!this.results.redis) {
      recommendations.push('بررسی تنظیمات اتصال Redis');
      recommendations.push('اطمینان از راه‌اندازی سرویس Redis');
    }

    if (!this.results.migrations) {
      recommendations.push('اجرای Migration ها: npm run migrate:up');
      recommendations.push('بررسی لاگ‌های Migration برای خطاهای احتمالی');
    }

    if (!this.results.models) {
      recommendations.push('بررسی تعریف مدل‌ها و روابط');
      recommendations.push('اجرای تست‌های جداگانه مدل‌ها');
    }

    if (!this.results.connectionPool) {
      recommendations.push('بررسی تنظیمات Connection Pool');
      recommendations.push('افزایش timeout های اتصال');
    }

    if (recommendations.length === 0) {
      recommendations.push('سیستم در وضعیت مطلوب قرار دارد');
      recommendations.push('می‌توانید به مرحله بعدی توسعه بروید');
    }

    return recommendations;
  }

  /**
   * پاکسازی منابع
   */
  async cleanup() {
    try {
      await connectionPool.close();
      logger.info('🧹 پاکسازی منابع تکمیل شد');
    } catch (error) {
      logger.warn('⚠️ خطا در پاکسازی منابع', { error: error.message });
    }
  }
}

/**
 * تابع اصلی
 */
async function main() {
  const tester = new SystemTester();
  
  try {
    const success = await tester.runAllTests();
    
    // تولید گزارش
    const report = tester.generateReport();
    
    // نمایش گزارش خلاصه
    console.log('\n' + '='.repeat(60));
    console.log('📋 گزارش تست سیستم تدبیرخوان');
    console.log('='.repeat(60));
    console.log(`⏰ زمان: ${report.timestamp}`);
    console.log(`🌍 محیط: ${report.environment}`);
    console.log(`📊 نتیجه کلی: ${success ? '✅ موفق' : '❌ ناموفق'}`);
    console.log('\n💡 توصیه‌ها:');
    report.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    console.log('='.repeat(60) + '\n');

    return success;
    
  } catch (error) {
    logger.error('💥 خطای کلی در تست سیستم', { error: error.message });
    return false;
  } finally {
    await tester.cleanup();
  }
}

// اجرای تست سیستم
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('خطای کلی:', error);
      process.exit(1);
    });
}

export { SystemTester, main as runSystemTest };