/**
 * Migration: ایجاد جدول سفارشات
 */

export const up = async (queryInterface, Sequelize) => {
  // ایجاد enum برای وضعیت سفارش
  await queryInterface.sequelize.query(`
    CREATE TYPE "order_status_enum" AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled');
  `);

  // ایجاد enum برای نوع سفارش
  await queryInterface.sequelize.query(`
    CREATE TYPE "order_type_enum" AS ENUM ('individual', 'company');
  `);

  // ایجاد جدول سفارشات
  await queryInterface.createTable('orders', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    order_number: {
      type: Sequelize.STRING(50),
      allowNull: false,
      unique: true
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    company_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'companies',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    daily_menu_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'daily_menus',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    order_type: {
      type: Sequelize.ENUM('individual', 'company'),
      allowNull: false,
      defaultValue: 'individual'
    },
    status: {
      type: Sequelize.ENUM('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    subtotal: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    discount_amount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    tax_amount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    delivery_fee: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    total_amount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    delivery_date: {
      type: Sequelize.DATEONLY,
      allowNull: false
    },
    delivery_time_slot: {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'بازه زمانی تحویل'
    },
    delivery_address: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    delivery_notes: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    special_instructions: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    cancelled_reason: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    cancelled_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    cancelled_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    confirmed_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    prepared_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    delivered_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    rating: {
      type: Sequelize.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },
    review: {
      type: Sequelize.TEXT,
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
  await queryInterface.addIndex('orders', ['order_number'], {
    unique: true,
    name: 'orders_order_number_unique_idx'
  });

  await queryInterface.addIndex('orders', ['user_id'], {
    name: 'orders_user_id_idx'
  });

  await queryInterface.addIndex('orders', ['company_id'], {
    name: 'orders_company_id_idx'
  });

  await queryInterface.addIndex('orders', ['daily_menu_id'], {
    name: 'orders_daily_menu_id_idx'
  });

  await queryInterface.addIndex('orders', ['status'], {
    name: 'orders_status_idx'
  });

  await queryInterface.addIndex('orders', ['order_type'], {
    name: 'orders_order_type_idx'
  });

  await queryInterface.addIndex('orders', ['delivery_date'], {
    name: 'orders_delivery_date_idx'
  });

  await queryInterface.addIndex('orders', ['total_amount'], {
    name: 'orders_total_amount_idx'
  });

  await queryInterface.addIndex('orders', ['cancelled_by'], {
    name: 'orders_cancelled_by_idx'
  });

  await queryInterface.addIndex('orders', ['created_at'], {
    name: 'orders_created_at_idx'
  });

  await queryInterface.addIndex('orders', ['confirmed_at'], {
    name: 'orders_confirmed_at_idx'
  });

  await queryInterface.addIndex('orders', ['delivered_at'], {
    name: 'orders_delivered_at_idx'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // حذف جدول
  await queryInterface.dropTable('orders');

  // حذف enum ها
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "order_status_enum";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "order_type_enum";');
};