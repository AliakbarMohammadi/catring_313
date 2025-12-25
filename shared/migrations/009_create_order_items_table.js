/**
 * Migration: ایجاد جدول اقلام سفارش
 */

export const up = async (queryInterface, Sequelize) => {
  // ایجاد جدول اقلام سفارش
  await queryInterface.createTable('order_items', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    order_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    menu_item_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'menu_items',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    food_item_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'food_items',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    quantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1
      }
    },
    unit_price: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      comment: 'قیمت واحد در زمان سفارش'
    },
    total_price: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      comment: 'قیمت کل (quantity * unit_price)'
    },
    discount_percentage: {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0,
        max: 100
      }
    },
    discount_amount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    final_price: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      comment: 'قیمت نهایی پس از تخفیف'
    },
    special_instructions: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'دستورات ویژه برای این آیتم'
    },
    customizations: {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'سفارشی‌سازی‌های این آیتم'
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
  await queryInterface.addIndex('order_items', ['order_id'], {
    name: 'order_items_order_id_idx'
  });

  await queryInterface.addIndex('order_items', ['menu_item_id'], {
    name: 'order_items_menu_item_id_idx'
  });

  await queryInterface.addIndex('order_items', ['food_item_id'], {
    name: 'order_items_food_item_id_idx'
  });

  await queryInterface.addIndex('order_items', ['unit_price'], {
    name: 'order_items_unit_price_idx'
  });

  await queryInterface.addIndex('order_items', ['total_price'], {
    name: 'order_items_total_price_idx'
  });

  await queryInterface.addIndex('order_items', ['customizations'], {
    using: 'gin',
    name: 'order_items_customizations_gin_idx'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // حذف جدول
  await queryInterface.dropTable('order_items');
};