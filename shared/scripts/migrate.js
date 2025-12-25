#!/usr/bin/env node

/**
 * اسکریپت اجرای Migration ها
 * استفاده: node shared/scripts/migrate.js [command] [options]
 */

import { Umzug, SequelizeStorage } from 'umzug';
import { Sequelize } from 'sequelize';
import { sequelize, testConnection } from '../config/database.js';
import { createLogger } from '../utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = createLogger('migration');

/**
 * پیکربندی Umzug
 */
const umzug = new Umzug({
  migrations: {
    glob: path.join(__dirname, '../migrations/*.js'),
    resolve: ({ name, path: migrationPath, context }) => {
      return {
        name,
        up: async () => {
          const migration = await import(migrationPath);
          return migration.up(context, Sequelize);
        },
        down: async () => {
          const migration = await import(migrationPath);
          return migration.down(context, Sequelize);
        }
      };
    }
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ 
    sequelize,
    tableName: 'sequelize_meta'
  }),
  logger: {
    info: (message) => logger.info(`Migration: ${message}`),
    warn: (message) => logger.warn(`Migration: ${message}`),
    error: (message) => logger.error(`Migration: ${message}`)
  }
});

/**
 * اجرای تمام migration های pending
 */
async function runMigrations() {
  try {
    logger.info('🔄 شروع اجرای migration ها...');
    
    const migrations = await umzug.up();
    
    if (migrations.length > 0) {
      logger.info('✅ Migration ها با موفقیت اجرا شدند:', {
        count: migrations.length,
        migrations: migrations.map(m => m.name)
      });
    } else {
      logger.info('ℹ️ هیچ migration جدیدی برای اجرا وجود ندارد');
    }
    
    return true;
  } catch (error) {
    logger.error('❌ خطا در اجرای migration ها:', { error: error.message });
    throw error;
  }
}

/**
 * بازگردانی migration ها
 */
async function rollbackMigrations(steps = 1) {
  try {
    logger.info(`🔄 شروع بازگردانی ${steps} migration...`);
    
    const migrations = await umzug.down({ step: steps });
    
    if (migrations.length > 0) {
      logger.info('✅ Migration ها با موفقیت بازگردانی شدند:', {
        count: migrations.length,
        migrations: migrations.map(m => m.name)
      });
    } else {
      logger.info('ℹ️ هیچ migration برای بازگردانی وجود ندارد');
    }
    
    return true;
  } catch (error) {
    logger.error('❌ خطا در بازگردانی migration ها:', { error: error.message });
    throw error;
  }
}

/**
 * نمایش وضعیت migration ها
 */
async function showStatus() {
  try {
    const executed = await umzug.executed();
    const pending = await umzug.pending();
    
    logger.info('📊 وضعیت Migration ها:');
    
    if (executed.length > 0) {
      logger.info(`✅ اجرا شده (${executed.length}):`);
      executed.forEach(migration => {
        logger.info(`  - ${migration.name}`);
      });
    }
    
    if (pending.length > 0) {
      logger.info(`⏳ در انتظار اجرا (${pending.length}):`);
      pending.forEach(migration => {
        logger.info(`  - ${migration.name}`);
      });
    }
    
    if (executed.length === 0 && pending.length === 0) {
      logger.info('ℹ️ هیچ migration یافت نشد');
    }
    
    return { executed, pending };
  } catch (error) {
    logger.error('❌ خطا در نمایش وضعیت:', { error: error.message });
    throw error;
  }
}

/**
 * ایجاد migration جدید
 */
async function createMigration(name) {
  if (!name) {
    logger.error('❌ نام migration الزامی است');
    process.exit(1);
  }
  
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const filename = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}.js`;
  const filepath = path.join(__dirname, '../migrations', filename);
  
  const template = `/**
 * Migration: ${name}
 */

export const up = async (queryInterface, Sequelize) => {
  // TODO: پیاده‌سازی migration
};

export const down = async (queryInterface, Sequelize) => {
  // TODO: پیاده‌سازی rollback
};
`;

  try {
    const fs = await import('fs/promises');
    await fs.writeFile(filepath, template, 'utf8');
    logger.info(`✅ Migration جدید ایجاد شد: ${filename}`);
  } catch (error) {
    logger.error('❌ خطا در ایجاد migration:', { error: error.message });
    throw error;
  }
}

/**
 * ریست کامل دیتابیس (خطرناک!)
 */
async function resetDatabase() {
  try {
    logger.warn('⚠️ شروع ریست کامل دیتابیس...');
    
    // بازگردانی تمام migration ها
    const executed = await umzug.executed();
    if (executed.length > 0) {
      await umzug.down({ to: 0 });
      logger.info('✅ تمام migration ها بازگردانی شدند');
    }
    
    // اجرای مجدد تمام migration ها
    await umzug.up();
    logger.info('✅ تمام migration ها مجدداً اجرا شدند');
    
    logger.info('✅ ریست دیتابیس تکمیل شد');
    return true;
  } catch (error) {
    logger.error('❌ خطا در ریست دیتابیس:', { error: error.message });
    throw error;
  }
}

/**
 * نمایش راهنما
 */
function showHelp() {
  console.log(`
🗄️ اسکریپت مدیریت Migration های تدبیرخوان

استفاده:
  node shared/scripts/migrate.js <command> [options]

دستورات:
  up                    اجرای تمام migration های pending
  down [steps]          بازگردانی migration ها (پیش‌فرض: 1)
  status               نمایش وضعیت migration ها
  create <name>        ایجاد migration جدید
  reset                ریست کامل دیتابیس (خطرناک!)
  help                 نمایش این راهنما

مثال‌ها:
  node shared/scripts/migrate.js up
  node shared/scripts/migrate.js down 2
  node shared/scripts/migrate.js status
  node shared/scripts/migrate.js create "add_user_preferences"
  node shared/scripts/migrate.js reset

متغیرهای محیطی:
  NODE_ENV             محیط اجرا (development, test, production)
  DB_HOST              آدرس دیتابیس
  DB_NAME              نام دیتابیس
  DB_USERNAME          نام کاربری دیتابیس
  DB_PASSWORD          رمز عبور دیتابیس
`);
}

/**
 * تابع اصلی
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === 'help') {
    showHelp();
    return;
  }
  
  try {
    // تست اتصال دیتابیس
    const connected = await testConnection();
    if (!connected) {
      logger.error('❌ اتصال دیتابیس برقرار نیست');
      process.exit(1);
    }
    
    switch (command) {
      case 'up':
        await runMigrations();
        break;
        
      case 'down':
        const steps = parseInt(args[1]) || 1;
        await rollbackMigrations(steps);
        break;
        
      case 'status':
        await showStatus();
        break;
        
      case 'create':
        const name = args.slice(1).join(' ');
        await createMigration(name);
        break;
        
      case 'reset':
        // تأیید برای عملیات خطرناک
        if (process.env.NODE_ENV === 'production') {
          logger.error('❌ ریست دیتابیس در محیط production مجاز نیست');
          process.exit(1);
        }
        
        logger.warn('⚠️ این عملیات تمام داده‌ها را حذف می‌کند!');
        logger.warn('⚠️ برای ادامه، متغیر CONFIRM_RESET=true را تنظیم کنید');
        
        if (process.env.CONFIRM_RESET !== 'true') {
          process.exit(1);
        }
        
        await resetDatabase();
        break;
        
      default:
        logger.error(`❌ دستور نامعتبر: ${command}`);
        showHelp();
        process.exit(1);
    }
    
    logger.info('🎉 عملیات با موفقیت تکمیل شد');
    
  } catch (error) {
    logger.error('💥 خطای غیرمنتظره:', { error: error.message });
    process.exit(1);
  } finally {
    // بستن اتصال دیتابیس
    await sequelize.close();
  }
}

// اجرای تابع اصلی
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('خطای کلی:', error);
    process.exit(1);
  });
}

export {
  runMigrations,
  rollbackMigrations,
  showStatus,
  createMigration,
  resetDatabase
};