/**
 * Migration: ایجاد جدول تنظیمات اعلان‌رسانی
 */

export const up = async (queryInterface, Sequelize) => {
  // ایجاد جدول تنظیمات اعلان‌رسانی
  await queryInterface.createTable('notification_preferences', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    // اعلان‌های سفارش
    order_confirmation_email: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    order_confirmation_sms: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    order_status_email: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    order_status_sms: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    order_ready_email: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    order_ready_sms: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    // اعلان‌های پرداخت
    payment_success_email: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    payment_success_sms: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    payment_failed_email: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    payment_failed_sms: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    // اعلان‌های منو
    daily_menu_email: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    daily_menu_sms: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    menu_reminder_email: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    menu_reminder_sms: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    // اعلان‌های شرکت
    company_approval_email: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    company_approval_sms: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    employee_added_email: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    employee_added_sms: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    // اعلان‌های فاکتور
    invoice_generated_email: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    invoice_generated_sms: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    invoice_reminder_email: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    invoice_reminder_sms: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    // اعلان‌های عمومی
    promotional_email: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    promotional_sms: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    newsletter_email: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    // تنظیمات زمان‌بندی
    quiet_hours_start: {
      type: Sequelize.TIME,
      allowNull: true,
      defaultValue: '22:00:00',
      comment: 'شروع ساعات سکوت'
    },
    quiet_hours_end: {
      type: Sequelize.TIME,
      allowNull: true,
      defaultValue: '08:00:00',
      comment: 'پایان ساعات سکوت'
    },
    timezone: {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'Asia/Tehran'
    },
    // تنظیمات زبان
    language: {
      type: Sequelize.STRING(5),
      allowNull: false,
      defaultValue: 'fa'
    },
    // تنظیمات اضافی
    frequency_limit_per_day: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 10,
      comment: 'حداکثر تعداد اعلان در روز'
    },
    custom_settings: {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'تنظیمات سفارشی اضافی'
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    }
  });

  // ایجاد index ها
  await queryInterface.addIndex('notification_preferences', ['user_id'], {
    unique: true,
    name: 'notification_preferences_user_id_unique_idx'
  });

  await queryInterface.addIndex('notification_preferences', ['language'], {
    name: 'notification_preferences_language_idx'
  });

  await queryInterface.addIndex('notification_preferences', ['timezone'], {
    name: 'notification_preferences_timezone_idx'
  });

  await queryInterface.addIndex('notification_preferences', ['custom_settings'], {
    using: 'gin',
    name: 'notification_preferences_custom_settings_gin_idx'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // حذف جدول
  await queryInterface.dropTable('notification_preferences');
};