/**
 * Migration: ایجاد جدول منوهای روزانه
 */

export const up = async (queryInterface, Sequelize) => {
  // ایجاد enum برای وضعیت منو
  await queryInterface.sequelize.query(`
    CREATE TYPE "menu_status_enum" AS ENUM ('draft', 'published', 'archived');
  `);

  // ایجاد جدول منوهای روزانه
  await queryInterface.createTable('daily_menus', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    menu_date: {
      type: Sequelize.DATEONLY,
      allowNull: false
    },
    title: {
      type: Sequelize.STRING(255),
      allowNull: true
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    status: {
      type: Sequelize.ENUM('draft', 'published', 'archived'),
      allowNull: false,
      defaultValue: 'draft'
    },
    order_deadline: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'آخرین زمان سفارش'
    },
    delivery_start_time: {
      type: Sequelize.TIME,
      allowNull: true,
      comment: 'شروع زمان تحویل'
    },
    delivery_end_time: {
      type: Sequelize.TIME,
      allowNull: true,
      comment: 'پایان زمان تحویل'
    },
    max_orders: {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'حداکثر تعداد سفارش'
    },
    current_orders: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'تعداد سفارش فعلی'
    },
    special_notes: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'یادداشت‌های ویژه'
    },
    is_holiday: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    created_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    published_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    published_at: {
      type: Sequelize.DATE,
      allowNull: true
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
  await queryInterface.addIndex('daily_menus', ['menu_date'], {
    unique: true,
    name: 'daily_menus_menu_date_unique_idx'
  });

  await queryInterface.addIndex('daily_menus', ['status'], {
    name: 'daily_menus_status_idx'
  });

  await queryInterface.addIndex('daily_menus', ['order_deadline'], {
    name: 'daily_menus_order_deadline_idx'
  });

  await queryInterface.addIndex('daily_menus', ['is_holiday'], {
    name: 'daily_menus_is_holiday_idx'
  });

  await queryInterface.addIndex('daily_menus', ['created_by'], {
    name: 'daily_menus_created_by_idx'
  });

  await queryInterface.addIndex('daily_menus', ['published_by'], {
    name: 'daily_menus_published_by_idx'
  });

  await queryInterface.addIndex('daily_menus', ['created_at'], {
    name: 'daily_menus_created_at_idx'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // حذف جدول
  await queryInterface.dropTable('daily_menus');

  // حذف enum
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "menu_status_enum";');
};