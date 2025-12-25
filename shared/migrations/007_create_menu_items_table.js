/**
 * Migration: ایجاد جدول اقلام منوی روزانه
 */

export const up = async (queryInterface, Sequelize) => {
  // ایجاد جدول اقلام منوی روزانه
  await queryInterface.createTable('menu_items', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    daily_menu_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'daily_menus',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    food_item_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'food_items',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    price: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      comment: 'قیمت در این منو (ممکن است با قیمت پایه متفاوت باشد)'
    },
    available_quantity: {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'تعداد موجود برای این روز'
    },
    reserved_quantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'تعداد رزرو شده'
    },
    sold_quantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'تعداد فروخته شده'
    },
    is_available: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    is_featured: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'آیا این آیتم ویژه روز است؟'
    },
    discount_percentage: {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0.00,
      validate: {
        min: 0,
        max: 100
      }
    },
    special_price: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'قیمت ویژه (در صورت تخفیف)'
    },
    sort_order: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'یادداشت‌های ویژه برای این روز'
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
  await queryInterface.addIndex('menu_items', ['daily_menu_id', 'food_item_id'], {
    unique: true,
    name: 'menu_items_daily_menu_food_item_unique_idx'
  });

  await queryInterface.addIndex('menu_items', ['daily_menu_id'], {
    name: 'menu_items_daily_menu_id_idx'
  });

  await queryInterface.addIndex('menu_items', ['food_item_id'], {
    name: 'menu_items_food_item_id_idx'
  });

  await queryInterface.addIndex('menu_items', ['is_available'], {
    name: 'menu_items_is_available_idx'
  });

  await queryInterface.addIndex('menu_items', ['is_featured'], {
    name: 'menu_items_is_featured_idx'
  });

  await queryInterface.addIndex('menu_items', ['price'], {
    name: 'menu_items_price_idx'
  });

  await queryInterface.addIndex('menu_items', ['sort_order'], {
    name: 'menu_items_sort_order_idx'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // حذف جدول
  await queryInterface.dropTable('menu_items');
};