#!/usr/bin/env node

/**
 * اسکریپت Seed برای داده‌های اولیه
 * استفاده: node shared/scripts/seed.js [environment]
 */

import { sequelize, testConnection } from '../config/database.js';
import { createLogger } from '../utils/logger.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('seed');

/**
 * داده‌های seed برای محیط development
 */
const developmentSeeds = {
  // کاربران اولیه
  users: [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: 'admin@tadbirkhawan.com',
      password: 'Admin123!',
      first_name: 'مدیر',
      last_name: 'سیستم',
      user_type: 'catering_manager',
      status: 'active',
      email_verified: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      email: 'company@example.com',
      password: 'Company123!',
      first_name: 'مدیر',
      last_name: 'شرکت نمونه',
      user_type: 'company_admin',
      status: 'active',
      email_verified: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      email: 'user@example.com',
      password: 'User123!',
      first_name: 'کاربر',
      last_name: 'نمونه',
      user_type: 'individual_user',
      status: 'active',
      email_verified: true
    }
  ],

  // شرکت نمونه
  companies: [
    {
      id: '550e8400-e29b-41d4-a716-446655440101',
      name: 'شرکت فناوری نمونه',
      registration_number: '123456789',
      tax_id: 'TAX123456',
      address: 'تهران، خیابان ولیعصر، پلاک 123',
      city: 'تهران',
      postal_code: '1234567890',
      phone: '02112345678',
      email: 'info@example.com',
      website: 'https://example.com',
      company_code: 'EXAMPLE001',
      admin_user_id: '550e8400-e29b-41d4-a716-446655440002',
      status: 'approved',
      approved_by: '550e8400-e29b-41d4-a716-446655440001',
      approved_at: new Date(),
      employee_count: 50,
      max_employees: 100,
      subscription_plan: 'premium'
    }
  ],

  // کارمند نمونه
  employees: [
    {
      id: '550e8400-e29b-41d4-a716-446655440201',
      user_id: '550e8400-e29b-41d4-a716-446655440003',
      company_id: '550e8400-e29b-41d4-a716-446655440101',
      employee_code: 'EMP001',
      department: 'فناوری اطلاعات',
      position: 'توسعه‌دهنده',
      hire_date: new Date('2024-01-01'),
      status: 'active',
      daily_meal_allowance: 50000.00,
      monthly_meal_budget: 1000000.00,
      can_order: true,
      added_by: '550e8400-e29b-41d4-a716-446655440002'
    }
  ],

  // اقلام غذایی نمونه
  foodItems: [
    {
      id: '550e8400-e29b-41d4-a716-446655440301',
      name: 'چلو کباب کوبیده',
      name_en: 'Chelo Kabab Koobideh',
      description: 'برنج سفید با کباب کوبیده و سبزی خوردن',
      category_id: '550e8400-e29b-41d4-a716-446655440001', // غذای اصلی
      price: 120000.00,
      cost_price: 80000.00,
      unit: 'portion',
      weight: 350.00,
      calories: 650,
      ingredients: 'برنج، گوشت چرخ کرده، پیاز، ادویه',
      image_url: '/images/chelo-kabab.jpg',
      preparation_time: 25,
      is_vegetarian: false,
      is_vegan: false,
      is_gluten_free: false,
      is_spicy: false,
      is_available: true,
      is_active: true,
      sort_order: 1,
      tags: ['محبوب', 'سنتی', 'پروتئین'],
      created_by: '550e8400-e29b-41d4-a716-446655440001'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440302',
      name: 'خورشت قیمه',
      name_en: 'Ghormeh Sabzi',
      description: 'خورشت قیمه با برنج سفید',
      category_id: '550e8400-e29b-41d4-a716-446655440001',
      price: 95000.00,
      cost_price: 65000.00,
      unit: 'portion',
      weight: 300.00,
      calories: 520,
      ingredients: 'گوشت، نخود، رب گوجه، پیاز، ادویه',
      image_url: '/images/ghormeh-sabzi.jpg',
      preparation_time: 20,
      is_vegetarian: false,
      is_vegan: false,
      is_gluten_free: true,
      is_spicy: false,
      is_available: true,
      is_active: true,
      sort_order: 2,
      tags: ['خورشت', 'سنتی'],
      created_by: '550e8400-e29b-41d4-a716-446655440001'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440303',
      name: 'سالاد فصل',
      name_en: 'Seasonal Salad',
      description: 'سالاد تازه با سبزیجات فصل',
      category_id: '550e8400-e29b-41d4-a716-446655440002', // پیش غذا
      price: 35000.00,
      cost_price: 20000.00,
      unit: 'portion',
      weight: 150.00,
      calories: 120,
      ingredients: 'کاهو، گوجه، خیار، هویج، کلم',
      image_url: '/images/seasonal-salad.jpg',
      preparation_time: 10,
      is_vegetarian: true,
      is_vegan: true,
      is_gluten_free: true,
      is_spicy: false,
      is_available: true,
      is_active: true,
      sort_order: 1,
      tags: ['سالم', 'گیاهی', 'تازه'],
      created_by: '550e8400-e29b-41d4-a716-446655440001'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440304',
      name: 'دوغ',
      name_en: 'Doogh',
      description: 'نوشیدنی سنتی ایرانی',
      category_id: '550e8400-e29b-41d4-a716-446655440003', // نوشیدنی
      price: 15000.00,
      cost_price: 8000.00,
      unit: 'piece',
      weight: 250.00,
      calories: 80,
      ingredients: 'ماست، آب، نمک، نعنا',
      image_url: '/images/doogh.jpg',
      preparation_time: 5,
      is_vegetarian: true,
      is_vegan: false,
      is_gluten_free: true,
      is_spicy: false,
      is_available: true,
      is_active: true,
      sort_order: 1,
      tags: ['سنتی', 'خنک کننده'],
      created_by: '550e8400-e29b-41d4-a716-446655440001'
    }
  ],

  // منوی روزانه نمونه
  dailyMenus: [
    {
      id: '550e8400-e29b-41d4-a716-446655440401',
      menu_date: new Date().toISOString().split('T')[0], // امروز
      title: 'منوی امروز',
      description: 'منوی متنوع با غذاهای سنتی و مدرن',
      status: 'published',
      order_deadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 ساعت بعد
      delivery_start_time: '12:00:00',
      delivery_end_time: '14:00:00',
      max_orders: 100,
      current_orders: 0,
      special_notes: 'غذاهای امروز با مواد تازه تهیه شده‌اند',
      is_holiday: false,
      created_by: '550e8400-e29b-41d4-a716-446655440001',
      published_by: '550e8400-e29b-41d4-a716-446655440001',
      published_at: new Date()
    }
  ],

  // اقلام منوی روزانه
  menuItems: [
    {
      id: '550e8400-e29b-41d4-a716-446655440501',
      daily_menu_id: '550e8400-e29b-41d4-a716-446655440401',
      food_item_id: '550e8400-e29b-41d4-a716-446655440301',
      price: 120000.00,
      available_quantity: 50,
      reserved_quantity: 0,
      sold_quantity: 0,
      is_available: true,
      is_featured: true,
      discount_percentage: 0.00,
      sort_order: 1
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440502',
      daily_menu_id: '550e8400-e29b-41d4-a716-446655440401',
      food_item_id: '550e8400-e29b-41d4-a716-446655440302',
      price: 95000.00,
      available_quantity: 40,
      reserved_quantity: 0,
      sold_quantity: 0,
      is_available: true,
      is_featured: false,
      discount_percentage: 0.00,
      sort_order: 2
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440503',
      daily_menu_id: '550e8400-e29b-41d4-a716-446655440401',
      food_item_id: '550e8400-e29b-41d4-a716-446655440303',
      price: 35000.00,
      available_quantity: 30,
      reserved_quantity: 0,
      sold_quantity: 0,
      is_available: true,
      is_featured: false,
      discount_percentage: 0.00,
      sort_order: 3
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440504',
      daily_menu_id: '550e8400-e29b-41d4-a716-446655440401',
      food_item_id: '550e8400-e29b-41d4-a716-446655440304',
      price: 15000.00,
      available_quantity: 60,
      reserved_quantity: 0,
      sold_quantity: 0,
      is_available: true,
      is_featured: false,
      discount_percentage: 0.00,
      sort_order: 4
    }
  ]
};

/**
 * داده‌های seed برای محیط test
 */
const testSeeds = {
  users: [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: 'test@example.com',
      password: 'Test123!',
      first_name: 'تست',
      last_name: 'کاربر',
      user_type: 'individual_user',
      status: 'active',
      email_verified: true
    }
  ]
};

/**
 * هش کردن رمزهای عبور
 */
async function hashPasswords(users) {
  const hashedUsers = [];
  
  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 12);
    hashedUsers.push({
      ...user,
      password_hash: hashedPassword,
      password: undefined // حذف رمز عبور خام
    });
  }
  
  return hashedUsers;
}

/**
 * درج داده‌های seed
 */
async function seedData(environment = 'development') {
  try {
    const seeds = environment === 'test' ? testSeeds : developmentSeeds;
    
    logger.info(`🌱 شروع seed برای محیط ${environment}...`);
    
    // شروع transaction
    const transaction = await sequelize.transaction();
    
    try {
      // درج کاربران
      if (seeds.users && seeds.users.length > 0) {
        logger.info('👥 درج کاربران...');
        const hashedUsers = await hashPasswords(seeds.users);
        
        await sequelize.getQueryInterface().bulkInsert('users', hashedUsers, {
          transaction,
          ignoreDuplicates: true
        });
        
        logger.info(`✅ ${hashedUsers.length} کاربر درج شد`);
      }
      
      // درج شرکت‌ها
      if (seeds.companies && seeds.companies.length > 0) {
        logger.info('🏢 درج شرکت‌ها...');
        
        await sequelize.getQueryInterface().bulkInsert('companies', seeds.companies, {
          transaction,
          ignoreDuplicates: true
        });
        
        logger.info(`✅ ${seeds.companies.length} شرکت درج شد`);
      }
      
      // درج کارمندان
      if (seeds.employees && seeds.employees.length > 0) {
        logger.info('👨‍💼 درج کارمندان...');
        
        await sequelize.getQueryInterface().bulkInsert('employees', seeds.employees, {
          transaction,
          ignoreDuplicates: true
        });
        
        logger.info(`✅ ${seeds.employees.length} کارمند درج شد`);
      }
      
      // درج اقلام غذایی
      if (seeds.foodItems && seeds.foodItems.length > 0) {
        logger.info('🍽️ درج اقلام غذایی...');
        
        await sequelize.getQueryInterface().bulkInsert('food_items', seeds.foodItems, {
          transaction,
          ignoreDuplicates: true
        });
        
        logger.info(`✅ ${seeds.foodItems.length} قلم غذایی درج شد`);
      }
      
      // درج منوهای روزانه
      if (seeds.dailyMenus && seeds.dailyMenus.length > 0) {
        logger.info('📋 درج منوهای روزانه...');
        
        await sequelize.getQueryInterface().bulkInsert('daily_menus', seeds.dailyMenus, {
          transaction,
          ignoreDuplicates: true
        });
        
        logger.info(`✅ ${seeds.dailyMenus.length} منوی روزانه درج شد`);
      }
      
      // درج اقلام منوی روزانه
      if (seeds.menuItems && seeds.menuItems.length > 0) {
        logger.info('🍴 درج اقلام منوی روزانه...');
        
        await sequelize.getQueryInterface().bulkInsert('menu_items', seeds.menuItems, {
          transaction,
          ignoreDuplicates: true
        });
        
        logger.info(`✅ ${seeds.menuItems.length} قلم منوی روزانه درج شد`);
      }
      
      // تأیید transaction
      await transaction.commit();
      
      logger.info('🎉 Seed با موفقیت تکمیل شد');
      return true;
      
    } catch (error) {
      // بازگردانی transaction
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    logger.error('❌ خطا در seed:', { error: error.message });
    throw error;
  }
}

/**
 * پاک کردن تمام داده‌ها
 */
async function clearData() {
  try {
    logger.warn('🗑️ شروع پاک کردن داده‌ها...');
    
    const transaction = await sequelize.transaction();
    
    try {
      // ترتیب حذف مهم است (به دلیل foreign key ها)
      const tables = [
        'menu_items',
        'daily_menus',
        'order_items',
        'orders',
        'payments',
        'invoices',
        'notifications',
        'notification_preferences',
        'employees',
        'companies',
        'food_items',
        'users',
        'audit_logs',
        'security_events'
      ];
      
      for (const table of tables) {
        await sequelize.getQueryInterface().bulkDelete(table, {}, { transaction });
        logger.info(`🗑️ جدول ${table} پاک شد`);
      }
      
      await transaction.commit();
      
      logger.info('✅ تمام داده‌ها پاک شدند');
      return true;
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    logger.error('❌ خطا در پاک کردن داده‌ها:', { error: error.message });
    throw error;
  }
}

/**
 * نمایش راهنما
 */
function showHelp() {
  console.log(`
🌱 اسکریپت Seed داده‌های اولیه تدبیرخوان

استفاده:
  node shared/scripts/seed.js [command] [environment]

دستورات:
  seed [env]           درج داده‌های seed (پیش‌فرض: development)
  clear               پاک کردن تمام داده‌ها
  reset [env]         پاک کردن و درج مجدد داده‌ها
  help                نمایش این راهنما

محیط‌ها:
  development         داده‌های کامل برای توسعه
  test                داده‌های محدود برای تست

مثال‌ها:
  node shared/scripts/seed.js seed
  node shared/scripts/seed.js seed test
  node shared/scripts/seed.js clear
  node shared/scripts/seed.js reset development
`);
}

/**
 * تابع اصلی
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'seed';
  const environment = args[1] || process.env.NODE_ENV || 'development';
  
  if (command === 'help') {
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
      case 'seed':
        await seedData(environment);
        break;
        
      case 'clear':
        if (environment === 'production') {
          logger.error('❌ پاک کردن داده‌ها در محیط production مجاز نیست');
          process.exit(1);
        }
        await clearData();
        break;
        
      case 'reset':
        if (environment === 'production') {
          logger.error('❌ ریست داده‌ها در محیط production مجاز نیست');
          process.exit(1);
        }
        await clearData();
        await seedData(environment);
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
  seedData,
  clearData,
  developmentSeeds,
  testSeeds
};