#!/usr/bin/env node

/**
 * اسکریپت تست اتصال و عملکرد مدل‌های دیتابیس
 */

import { sequelize, testConnection } from '../config/database.js';
import { createLogger } from '../utils/logger.js';
import connectionPool from '../utils/connectionPool.js';
import {
  User, Company, Employee, FoodCategory, FoodItem,
  DailyMenu, MenuItem, Order, OrderItem, Payment,
  Invoice, Notification, NotificationPreference,
  AuditLog, SecurityEvent, syncModels
} from '../models/index.js';

const logger = createLogger('test-models');

/**
 * تست اتصال دیتابیس
 */
async function testDatabaseConnection() {
  logger.info('🔍 تست اتصال دیتابیس...');
  
  try {
    const isConnected = await testConnection();
    if (isConnected) {
      logger.info('✅ اتصال PostgreSQL موفق');
    } else {
      throw new Error('اتصال PostgreSQL ناموفق');
    }

    // تست Redis
    await connectionPool.initialize();
    const redis = connectionPool.getRedisConnection();
    await redis.ping();
    logger.info('✅ اتصال Redis موفق');

    return true;
  } catch (error) {
    logger.error('❌ خطا در اتصال دیتابیس', { error: error.message });
    return false;
  }
}

/**
 * تست همگام‌سازی مدل‌ها
 */
async function testModelSync() {
  logger.info('🔄 تست همگام‌سازی مدل‌ها...');
  
  try {
    await syncModels({ alter: true });
    logger.info('✅ همگام‌سازی مدل‌ها موفق');
    return true;
  } catch (error) {
    logger.error('❌ خطا در همگام‌سازی مدل‌ها', { error: error.message });
    return false;
  }
}

/**
 * تست عملیات CRUD بر روی مدل‌ها
 */
async function testModelOperations() {
  logger.info('🧪 تست عملیات CRUD مدل‌ها...');
  
  const transaction = await sequelize.transaction();
  
  try {
    // تست مدل User
    logger.info('👤 تست مدل User...');
    const testUser = await User.create({
      email: 'test@example.com',
      password_hash: 'hashed_password',
      first_name: 'تست',
      last_name: 'کاربر',
      user_type: 'individual_user',
      status: 'active'
    }, { transaction });
    
    const foundUser = await User.findByPk(testUser.id, { transaction });
    if (!foundUser) throw new Error('کاربر یافت نشد');
    logger.info('✅ مدل User عملکرد صحیح دارد');

    // تست مدل Company
    logger.info('🏢 تست مدل Company...');
    const testCompany = await Company.create({
      name: 'شرکت تست',
      company_code: 'TEST001',
      admin_user_id: testUser.id,
      status: 'pending'
    }, { transaction });
    
    const foundCompany = await Company.findByPk(testCompany.id, { transaction });
    if (!foundCompany) throw new Error('شرکت یافت نشد');
    logger.info('✅ مدل Company عملکرد صحیح دارد');

    // تست مدل Employee
    logger.info('👨‍💼 تست مدل Employee...');
    const testEmployee = await Employee.create({
      user_id: testUser.id,
      company_id: testCompany.id,
      employee_code: 'EMP001',
      first_name: testUser.first_name,
      last_name: testUser.last_name,
      status: 'active',
      added_by: testUser.id
    }, { transaction });
    
    const foundEmployee = await Employee.findByPk(testEmployee.id, { transaction });
    if (!foundEmployee) throw new Error('کارمند یافت نشد');
    logger.info('✅ مدل Employee عملکرد صحیح دارد');

    // تست مدل FoodCategory
    logger.info('🍽️ تست مدل FoodCategory...');
    const testCategory = await FoodCategory.create({
      name: 'غذای اصلی',
      type: 'main_course',
      status: 'active',
      created_by: testUser.id
    }, { transaction });
    
    const foundCategory = await FoodCategory.findByPk(testCategory.id, { transaction });
    if (!foundCategory) throw new Error('دسته‌بندی یافت نشد');
    logger.info('✅ مدل FoodCategory عملکرد صحیح دارد');

    // تست مدل FoodItem
    logger.info('🍛 تست مدل FoodItem...');
    const testFoodItem = await FoodItem.create({
      name: 'چلو کباب',
      category_id: testCategory.id,
      price: 120000,
      status: 'active',
      created_by: testUser.id
    }, { transaction });
    
    const foundFoodItem = await FoodItem.findByPk(testFoodItem.id, { transaction });
    if (!foundFoodItem) throw new Error('غذا یافت نشد');
    logger.info('✅ مدل FoodItem عملکرد صحیح دارد');

    // تست مدل DailyMenu
    logger.info('📅 تست مدل DailyMenu...');
    const testDailyMenu = await DailyMenu.create({
      menu_date: new Date().toISOString().split('T')[0],
      title: 'منوی تست',
      status: 'draft',
      created_by: testUser.id
    }, { transaction });
    
    const foundDailyMenu = await DailyMenu.findByPk(testDailyMenu.id, { transaction });
    if (!foundDailyMenu) throw new Error('منوی روزانه یافت نشد');
    logger.info('✅ مدل DailyMenu عملکرد صحیح دارد');

    // تست مدل MenuItem
    logger.info('🍴 تست مدل MenuItem...');
    const testMenuItem = await MenuItem.create({
      daily_menu_id: testDailyMenu.id,
      food_item_id: testFoodItem.id,
      price: testFoodItem.price,
      quantity_available: 10
    }, { transaction });
    
    const foundMenuItem = await MenuItem.findByPk(testMenuItem.id, { transaction });
    if (!foundMenuItem) throw new Error('آیتم منو یافت نشد');
    logger.info('✅ مدل MenuItem عملکرد صحیح دارد');

    // تست مدل Order
    logger.info('📦 تست مدل Order...');
    const testOrder = await Order.create({
      user_id: testUser.id,
      daily_menu_id: testDailyMenu.id,
      total_amount: 120000,
      status: 'pending'
    }, { transaction });
    
    const foundOrder = await Order.findByPk(testOrder.id, { transaction });
    if (!foundOrder) throw new Error('سفارش یافت نشد');
    logger.info('✅ مدل Order عملکرد صحیح دارد');

    // تست مدل OrderItem
    logger.info('📋 تست مدل OrderItem...');
    const testOrderItem = await OrderItem.create({
      order_id: testOrder.id,
      menu_item_id: testMenuItem.id,
      food_item_id: testFoodItem.id,
      quantity: 1,
      price: testFoodItem.price
    }, { transaction });
    
    const foundOrderItem = await OrderItem.findByPk(testOrderItem.id, { transaction });
    if (!foundOrderItem) throw new Error('آیتم سفارش یافت نشد');
    logger.info('✅ مدل OrderItem عملکرد صحیح دارد');

    // تست مدل Payment
    logger.info('💳 تست مدل Payment...');
    const testPayment = await Payment.create({
      order_id: testOrder.id,
      user_id: testUser.id,
      amount: 120000,
      payment_method: 'credit_card',
      status: 'pending'
    }, { transaction });
    
    const foundPayment = await Payment.findByPk(testPayment.id, { transaction });
    if (!foundPayment) throw new Error('پرداخت یافت نشد');
    logger.info('✅ مدل Payment عملکرد صحیح دارد');

    // تست مدل Invoice
    logger.info('🧾 تست مدل Invoice...');
    const testInvoice = await Invoice.create({
      user_id: testUser.id,
      order_id: testOrder.id,
      invoice_type: 'individual',
      total_amount: 120000,
      status: 'draft',
      created_by: testUser.id
    }, { transaction });
    
    const foundInvoice = await Invoice.findByPk(testInvoice.id, { transaction });
    if (!foundInvoice) throw new Error('فاکتور یافت نشد');
    logger.info('✅ مدل Invoice عملکرد صحیح دارد');

    // تست مدل Notification
    logger.info('🔔 تست مدل Notification...');
    const testNotification = await Notification.create({
      user_id: testUser.id,
      type: 'order_confirmed',
      title: 'سفارش تأیید شد',
      message: 'سفارش شما با موفقیت تأیید شد',
      status: 'pending'
    }, { transaction });
    
    const foundNotification = await Notification.findByPk(testNotification.id, { transaction });
    if (!foundNotification) throw new Error('اعلان یافت نشد');
    logger.info('✅ مدل Notification عملکرد صحیح دارد');

    // تست مدل NotificationPreference
    logger.info('⚙️ تست مدل NotificationPreference...');
    const testNotificationPref = await NotificationPreference.create({
      user_id: testUser.id,
      email_enabled: true,
      sms_enabled: false
    }, { transaction });
    
    const foundNotificationPref = await NotificationPreference.findByPk(testNotificationPref.id, { transaction });
    if (!foundNotificationPref) throw new Error('تنظیمات اعلان یافت نشد');
    logger.info('✅ مدل NotificationPreference عملکرد صحیح دارد');

    // تست مدل AuditLog
    logger.info('📝 تست مدل AuditLog...');
    const testAuditLog = await AuditLog.create({
      user_id: testUser.id,
      action: 'create',
      resource_type: 'Order',
      resource_id: testOrder.id
    }, { transaction });
    
    const foundAuditLog = await AuditLog.findByPk(testAuditLog.id, { transaction });
    if (!foundAuditLog) throw new Error('لاگ حسابرسی یافت نشد');
    logger.info('✅ مدل AuditLog عملکرد صحیح دارد');

    // تست مدل SecurityEvent
    logger.info('🔒 تست مدل SecurityEvent...');
    const testSecurityEvent = await SecurityEvent.create({
      user_id: testUser.id,
      event_type: 'failed_login',
      severity: 'medium',
      description: 'تلاش ناموفق برای ورود'
    }, { transaction });
    
    const foundSecurityEvent = await SecurityEvent.findByPk(testSecurityEvent.id, { transaction });
    if (!foundSecurityEvent) throw new Error('رویداد امنیتی یافت نشد');
    logger.info('✅ مدل SecurityEvent عملکرد صحیح دارد');

    // بازگردانی تراکنش (پاک کردن داده‌های تست)
    await transaction.rollback();
    
    logger.info('✅ تمام مدل‌ها عملکرد صحیح دارند');
    return true;
    
  } catch (error) {
    await transaction.rollback();
    logger.error('❌ خطا در تست مدل‌ها', { error: error.message });
    return false;
  }
}

/**
 * تست روابط بین مدل‌ها
 */
async function testModelRelations() {
  logger.info('🔗 تست روابط بین مدل‌ها...');
  
  const transaction = await sequelize.transaction();
  
  try {
    // ایجاد داده‌های تست
    const testUser = await User.create({
      email: 'relation-test@example.com',
      password_hash: 'hashed_password',
      first_name: 'تست',
      last_name: 'رابطه',
      user_type: 'company_admin',
      status: 'active'
    }, { transaction });

    const testCompany = await Company.create({
      name: 'شرکت تست رابطه',
      company_code: 'REL001',
      admin_user_id: testUser.id,
      status: 'approved'
    }, { transaction });

    // تست رابطه User -> Company
    const userCompanies = await testUser.getAdminCompanies({ transaction });
    if (userCompanies.length !== 1) {
      throw new Error('رابطه User -> Company کار نمی‌کند');
    }
    logger.info('✅ رابطه User -> Company صحیح است');

    // تست رابطه Company -> User
    const companyAdmin = await testCompany.getAdmin({ transaction });
    if (!companyAdmin || companyAdmin.id !== testUser.id) {
      throw new Error('رابطه Company -> User کار نمی‌کند');
    }
    logger.info('✅ رابطه Company -> User صحیح است');

    // بازگردانی تراکنش
    await transaction.rollback();
    
    logger.info('✅ تمام روابط صحیح هستند');
    return true;
    
  } catch (error) {
    await transaction.rollback();
    logger.error('❌ خطا در تست روابط', { error: error.message });
    return false;
  }
}

/**
 * تست Connection Pool
 */
async function testConnectionPool() {
  logger.info('🏊 تست Connection Pool...');
  
  try {
    // دریافت آمار pool
    const stats = connectionPool.getPoolStats();
    logger.info('📊 آمار Connection Pool:', stats);

    // تست Health Check
    const healthResult = await connectionPool.performHealthCheck();
    if (!healthResult.postgres || !healthResult.redis) {
      throw new Error('Health Check ناموفق');
    }
    logger.info('✅ Health Check موفق');

    // تست تراکنش
    const result = await connectionPool.executeTransaction(async (transaction) => {
      const user = await User.create({
        email: 'pool-test@example.com',
        password_hash: 'test',
        first_name: 'تست',
        last_name: 'Pool',
        user_type: 'individual_user'
      }, { transaction });
      
      return user.id;
    });
    
    if (!result) throw new Error('تراکنش ناموفق');
    logger.info('✅ تراکنش موفق');

    // تست عملیات Redis
    await connectionPool.executeRedisOperation(async (redis) => {
      await redis.set('test-key', 'test-value');
      const value = await redis.get('test-key');
      if (value !== 'test-value') {
        throw new Error('عملیات Redis ناموفق');
      }
      await redis.del('test-key');
    });
    logger.info('✅ عملیات Redis موفق');

    logger.info('✅ Connection Pool عملکرد صحیح دارد');
    return true;
    
  } catch (error) {
    logger.error('❌ خطا در تست Connection Pool', { error: error.message });
    return false;
  }
}

/**
 * تابع اصلی تست
 */
async function runTests() {
  logger.info('🚀 شروع تست‌های مدل دیتابیس...');
  
  const results = {
    connection: false,
    sync: false,
    operations: false,
    relations: false,
    pool: false
  };
  
  try {
    // تست اتصال
    results.connection = await testDatabaseConnection();
    
    // تست همگام‌سازی
    if (results.connection) {
      results.sync = await testModelSync();
    }
    
    // تست عملیات CRUD
    if (results.sync) {
      results.operations = await testModelOperations();
    }
    
    // تست روابط
    if (results.operations) {
      results.relations = await testModelRelations();
    }
    
    // تست Connection Pool
    if (results.connection) {
      results.pool = await testConnectionPool();
    }
    
    // نتیجه نهایی
    const allPassed = Object.values(results).every(result => result === true);
    
    logger.info('📊 نتایج تست:', results);
    
    if (allPassed) {
      logger.info('🎉 تمام تست‌ها موفق بودند!');
      return true;
    } else {
      logger.error('❌ برخی تست‌ها ناموفق بودند');
      return false;
    }
    
  } catch (error) {
    logger.error('💥 خطای غیرمنتظره در تست‌ها', { error: error.message });
    return false;
  } finally {
    // بستن اتصالات
    await connectionPool.close();
  }
}

// اجرای تست‌ها
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('خطای کلی:', error);
      process.exit(1);
    });
}

export { runTests };