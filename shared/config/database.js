import { Sequelize } from 'sequelize';
import { createLogger } from '../utils/logger.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = createLogger('database');

/**
 * پیکربندی دیتابیس برای محیط‌های مختلف
 */
const config = {
  development: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../database.sqlite'),
    logging: (msg) => logger.debug(msg),
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  },
  
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  },
  
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    },
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
};

const environment = process.env.NODE_ENV || 'development';
const dbConfig = config[environment];

/**
 * ایجاد اتصال Sequelize
 */
export const sequelize = new Sequelize(dbConfig);

/**
 * تست اتصال دیتابیس
 */
export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info(`✅ اتصال دیتابیس برقرار شد (${environment})`, {
      dialect: dbConfig.dialect,
      storage: dbConfig.storage || 'N/A'
    });
    return true;
  } catch (error) {
    logger.error('❌ خطا در اتصال دیتابیس', {
      error: error.message,
      dialect: dbConfig.dialect
    });
    return false;
  }
};

/**
 * بستن اتصال دیتابیس
 */
export const closeConnection = async () => {
  try {
    await sequelize.close();
    logger.info('🔌 اتصال دیتابیس بسته شد');
  } catch (error) {
    logger.error('خطا در بستن اتصال دیتابیس', { error: error.message });
  }
};

/**
 * همگام‌سازی مدل‌ها با دیتابیس
 */
export const syncDatabase = async (options = {}) => {
  try {
    const { force = false, alter = false } = options;
    
    logger.info('🔄 شروع همگام‌سازی دیتابیس...', { force, alter });
    
    await sequelize.sync({ force, alter });
    
    logger.info('✅ همگام‌سازی دیتابیس تکمیل شد');
    return true;
  } catch (error) {
    logger.error('❌ خطا در همگام‌سازی دیتابیس', { error: error.message });
    return false;
  }
};

/**
 * اجرای migration ها
 */
export const runMigrations = async () => {
  try {
    const { Umzug, SequelizeStorage } = await import('umzug');
    
    const umzug = new Umzug({
      migrations: {
        glob: 'shared/migrations/*.js',
        resolve: ({ name, path, context }) => {
          const migration = require(path);
          return {
            name,
            up: async () => migration.up(context, Sequelize),
            down: async () => migration.down(context, Sequelize)
          };
        }
      },
      context: sequelize.getQueryInterface(),
      storage: new SequelizeStorage({ sequelize }),
      logger: {
        info: (message) => logger.info(`Migration: ${message}`),
        warn: (message) => logger.warn(`Migration: ${message}`),
        error: (message) => logger.error(`Migration: ${message}`)
      }
    });

    logger.info('🔄 شروع اجرای migration ها...');
    
    const migrations = await umzug.up();
    
    if (migrations.length > 0) {
      logger.info('✅ Migration ها با موفقیت اجرا شدند', {
        count: migrations.length,
        migrations: migrations.map(m => m.name)
      });
    } else {
      logger.info('ℹ️ هیچ migration جدیدی برای اجرا وجود ندارد');
    }
    
    return true;
  } catch (error) {
    logger.error('❌ خطا در اجرای migration ها', { error: error.message });
    return false;
  }
};

/**
 * بازگردانی migration ها
 */
export const rollbackMigrations = async (steps = 1) => {
  try {
    const { Umzug, SequelizeStorage } = await import('umzug');
    
    const umzug = new Umzug({
      migrations: {
        glob: 'shared/migrations/*.js',
        resolve: ({ name, path, context }) => {
          const migration = require(path);
          return {
            name,
            up: async () => migration.up(context, Sequelize),
            down: async () => migration.down(context, Sequelize)
          };
        }
      },
      context: sequelize.getQueryInterface(),
      storage: new SequelizeStorage({ sequelize }),
      logger: {
        info: (message) => logger.info(`Migration Rollback: ${message}`),
        warn: (message) => logger.warn(`Migration Rollback: ${message}`),
        error: (message) => logger.error(`Migration Rollback: ${message}`)
      }
    });

    logger.info(`🔄 شروع بازگردانی ${steps} migration...`);
    
    const migrations = await umzug.down({ step: steps });
    
    logger.info('✅ Migration ها با موفقیت بازگردانی شدند', {
      count: migrations.length,
      migrations: migrations.map(m => m.name)
    });
    
    return true;
  } catch (error) {
    logger.error('❌ خطا در بازگردانی migration ها', { error: error.message });
    return false;
  }
};

/**
 * پیکربندی Redis برای caching و session
 */
export const redisConfig = {
  // برای development از memory cache استفاده می‌کنیم
  useMemoryCache: process.env.REDIS_URL === 'memory://localhost',
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || null,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000
};

// Simple memory cache implementation
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  async get(key) {
    return this.cache.get(key) || null;
  }

  async set(key, value, ttl = null) {
    this.cache.set(key, value);
    
    if (ttl) {
      // Clear existing timer
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
      }
      
      // Set new timer
      const timer = setTimeout(() => {
        this.cache.delete(key);
        this.timers.delete(key);
      }, ttl * 1000);
      
      this.timers.set(key, timer);
    }
    
    return 'OK';
  }

  async del(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    return this.cache.delete(key) ? 1 : 0;
  }

  async exists(key) {
    return this.cache.has(key) ? 1 : 0;
  }

  async flushall() {
    this.cache.clear();
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    return 'OK';
  }

  async quit() {
    this.flushall();
    return 'OK';
  }
}

/**
 * ایجاد اتصال Redis یا Memory Cache
 */
export const createRedisConnection = async () => {
  try {
    if (redisConfig.useMemoryCache) {
      logger.info('✅ استفاده از Memory Cache به جای Redis');
      return new MemoryCache();
    }
    
    const Redis = (await import('ioredis')).default;
    
    const redis = new Redis(redisConfig);
    
    redis.on('connect', () => {
      logger.info('✅ اتصال Redis برقرار شد', {
        host: redisConfig.host,
        port: redisConfig.port,
        db: redisConfig.db
      });
    });
    
    redis.on('error', (error) => {
      logger.error('❌ خطا در اتصال Redis', { error: error.message });
    });
    
    redis.on('close', () => {
      logger.info('🔌 اتصال Redis بسته شد');
    });
    
    return redis;
  } catch (error) {
    logger.error('❌ خطا در ایجاد اتصال Redis، استفاده از Memory Cache', { error: error.message });
    return new MemoryCache();
  }
};

export { config };
export default sequelize;