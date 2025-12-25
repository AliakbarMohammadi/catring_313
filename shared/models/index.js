/**
 * فایل اصلی مدل‌ها - تعریف روابط و export مدل‌ها
 */

import { sequelize } from '../config/database.js';

// Import مدل‌ها
import User from './User.js';
import Company from './Company.js';
import Employee from './Employee.js';
import FoodCategory from './FoodCategory.js';
import FoodItem from './FoodItem.js';
import DailyMenu from './DailyMenu.js';
import MenuItem from './MenuItem.js';
import Order from './Order.js';
import OrderItem from './OrderItem.js';
import Payment from './Payment.js';
import Invoice from './Invoice.js';
import Notification from './Notification.js';
import NotificationPreference from './NotificationPreference.js';
import AuditLog from './AuditLog.js';
import SecurityEvent from './SecurityEvent.js';

/**
 * تعریف روابط بین مدل‌ها
 */
function defineAssociations() {
  // روابط User
  User.hasMany(Company, { 
    foreignKey: 'admin_user_id', 
    as: 'adminCompanies' 
  });
  
  User.hasMany(Company, { 
    foreignKey: 'approved_by', 
    as: 'approvedCompanies' 
  });
  
  User.hasOne(Employee, { 
    foreignKey: 'user_id', 
    as: 'employeeProfile' 
  });
  
  User.hasMany(Order, { 
    foreignKey: 'user_id', 
    as: 'orders' 
  });
  
  User.hasMany(Payment, { 
    foreignKey: 'user_id', 
    as: 'payments' 
  });
  
  User.hasMany(Notification, { 
    foreignKey: 'user_id', 
    as: 'notifications' 
  });
  
  User.hasOne(NotificationPreference, { 
    foreignKey: 'user_id', 
    as: 'notificationPreferences' 
  });

  // روابط Company
  Company.belongsTo(User, { 
    foreignKey: 'admin_user_id', 
    as: 'admin' 
  });
  
  Company.belongsTo(User, { 
    foreignKey: 'approved_by', 
    as: 'approver' 
  });
  
  Company.hasMany(Employee, { 
    foreignKey: 'company_id', 
    as: 'employees' 
  });
  
  Company.hasMany(Order, { 
    foreignKey: 'company_id', 
    as: 'orders' 
  });
  
  Company.hasMany(Invoice, { 
    foreignKey: 'company_id', 
    as: 'invoices' 
  });

  // روابط Employee
  Employee.belongsTo(User, { 
    foreignKey: 'user_id', 
    as: 'user' 
  });
  
  Employee.belongsTo(Company, { 
    foreignKey: 'company_id', 
    as: 'company' 
  });
  
  Employee.belongsTo(User, { 
    foreignKey: 'added_by', 
    as: 'addedBy' 
  });

  // روابط FoodCategory
  FoodCategory.hasMany(FoodItem, { 
    foreignKey: 'category_id', 
    as: 'foodItems' 
  });
  
  FoodCategory.belongsTo(User, { 
    foreignKey: 'created_by', 
    as: 'creator' 
  });

  // روابط FoodItem
  FoodItem.belongsTo(FoodCategory, { 
    foreignKey: 'category_id', 
    as: 'category' 
  });
  
  FoodItem.belongsTo(User, { 
    foreignKey: 'created_by', 
    as: 'creator' 
  });
  
  FoodItem.hasMany(MenuItem, { 
    foreignKey: 'food_item_id', 
    as: 'menuItems' 
  });
  
  FoodItem.hasMany(OrderItem, { 
    foreignKey: 'food_item_id', 
    as: 'orderItems' 
  });

  // روابط DailyMenu
  DailyMenu.hasMany(MenuItem, { 
    foreignKey: 'daily_menu_id', 
    as: 'menuItems' 
  });
  
  DailyMenu.hasMany(Order, { 
    foreignKey: 'daily_menu_id', 
    as: 'orders' 
  });
  
  DailyMenu.belongsTo(User, { 
    foreignKey: 'created_by', 
    as: 'creator' 
  });
  
  DailyMenu.belongsTo(User, { 
    foreignKey: 'published_by', 
    as: 'publisher' 
  });

  // روابط MenuItem
  MenuItem.belongsTo(DailyMenu, { 
    foreignKey: 'daily_menu_id', 
    as: 'dailyMenu' 
  });
  
  MenuItem.belongsTo(FoodItem, { 
    foreignKey: 'food_item_id', 
    as: 'foodItem' 
  });
  
  MenuItem.hasMany(OrderItem, { 
    foreignKey: 'menu_item_id', 
    as: 'orderItems' 
  });

  // روابط Order
  Order.belongsTo(User, { 
    foreignKey: 'user_id', 
    as: 'user' 
  });
  
  Order.belongsTo(Company, { 
    foreignKey: 'company_id', 
    as: 'company' 
  });
  
  Order.belongsTo(DailyMenu, { 
    foreignKey: 'daily_menu_id', 
    as: 'dailyMenu' 
  });
  
  Order.belongsTo(User, { 
    foreignKey: 'cancelled_by', 
    as: 'cancelledBy' 
  });
  
  Order.hasMany(OrderItem, { 
    foreignKey: 'order_id', 
    as: 'orderItems' 
  });
  
  Order.hasMany(Payment, { 
    foreignKey: 'order_id', 
    as: 'payments' 
  });
  
  Order.hasMany(Invoice, { 
    foreignKey: 'order_id', 
    as: 'invoices' 
  });

  // روابط OrderItem
  OrderItem.belongsTo(Order, { 
    foreignKey: 'order_id', 
    as: 'order' 
  });
  
  OrderItem.belongsTo(MenuItem, { 
    foreignKey: 'menu_item_id', 
    as: 'menuItem' 
  });
  
  OrderItem.belongsTo(FoodItem, { 
    foreignKey: 'food_item_id', 
    as: 'foodItem' 
  });

  // روابط Payment
  Payment.belongsTo(Order, { 
    foreignKey: 'order_id', 
    as: 'order' 
  });
  
  Payment.belongsTo(User, { 
    foreignKey: 'user_id', 
    as: 'user' 
  });
  
  Payment.belongsTo(User, { 
    foreignKey: 'refunded_by', 
    as: 'refundedBy' 
  });

  // روابط Invoice
  Invoice.belongsTo(User, { 
    foreignKey: 'user_id', 
    as: 'user' 
  });
  
  Invoice.belongsTo(Company, { 
    foreignKey: 'company_id', 
    as: 'company' 
  });
  
  Invoice.belongsTo(Order, { 
    foreignKey: 'order_id', 
    as: 'order' 
  });
  
  Invoice.belongsTo(User, { 
    foreignKey: 'created_by', 
    as: 'creator' 
  });

  // روابط Notification
  Notification.belongsTo(User, { 
    foreignKey: 'user_id', 
    as: 'user' 
  });

  // روابط NotificationPreference
  NotificationPreference.belongsTo(User, { 
    foreignKey: 'user_id', 
    as: 'user' 
  });

  // روابط AuditLog
  AuditLog.belongsTo(User, { 
    foreignKey: 'user_id', 
    as: 'user' 
  });

  // روابط SecurityEvent
  SecurityEvent.belongsTo(User, { 
    foreignKey: 'user_id', 
    as: 'user' 
  });
  
  SecurityEvent.belongsTo(User, { 
    foreignKey: 'investigated_by', 
    as: 'investigator' 
  });
  
  SecurityEvent.belongsTo(User, { 
    foreignKey: 'resolved_by', 
    as: 'resolver' 
  });
}

// تعریف روابط
defineAssociations();

/**
 * همگام‌سازی مدل‌ها با دیتابیس
 * @param {Object} options - تنظیمات همگام‌سازی
 */
export const syncModels = async (options = {}) => {
  try {
    await sequelize.sync(options);
    console.log('✅ مدل‌ها با موفقیت همگام‌سازی شدند');
  } catch (error) {
    console.error('❌ خطا در همگام‌سازی مدل‌ها:', error);
    throw error;
  }
};

/**
 * بستن اتصال دیتابیس
 */
export const closeConnection = async () => {
  try {
    await sequelize.close();
    console.log('🔌 اتصال دیتابیس بسته شد');
  } catch (error) {
    console.error('❌ خطا در بستن اتصال:', error);
    throw error;
  }
};

// Export مدل‌ها
export {
  sequelize,
  User,
  Company,
  Employee,
  FoodCategory,
  FoodItem,
  DailyMenu,
  MenuItem,
  Order,
  OrderItem,
  Payment,
  Invoice,
  Notification,
  NotificationPreference,
  AuditLog,
  SecurityEvent
};

// Export پیش‌فرض
export default {
  sequelize,
  User,
  Company,
  Employee,
  FoodCategory,
  FoodItem,
  DailyMenu,
  MenuItem,
  Order,
  OrderItem,
  Payment,
  Invoice,
  Notification,
  NotificationPreference,
  AuditLog,
  SecurityEvent,
  syncModels,
  closeConnection
};