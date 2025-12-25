/**
 * Migration: ایجاد جدول اقلام غذایی
 */

export const up = async (queryInterface, Sequelize) => {
  // ایجاد enum برای واحد اندازه‌گیری
  await queryInterface.sequelize.query(`
    CREATE TYPE "unit_enum" AS ENUM ('piece', 'gram', 'kilogram', 'liter', 'milliliter', 'portion');
  `);

  // ایجاد جدول اقلام غذایی
  await queryInterface.createTable('food_items', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: Sequelize.STRING(255),
      allowNull: false
    },
    name_en: {
      type: Sequelize.STRING(255),
      allowNull: true
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    category_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'food_categories',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    price: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    cost_price: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00
    },
    unit: {
      type: Sequelize.ENUM('piece', 'gram', 'kilogram', 'liter', 'milliliter', 'portion'),
      allowNull: false,
      defaultValue: 'piece'
    },
    weight: {
      type: Sequelize.DECIMAL(8, 2),
      allowNull: true,
      comment: 'وزن به گرم'
    },
    calories: {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'کالری در هر واحد'
    },
    ingredients: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'مواد تشکیل‌دهنده'
    },
    allergens: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'آلرژن‌ها'
    },
    image_url: {
      type: Sequelize.STRING(500),
      allowNull: true
    },
    preparation_time: {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'زمان آماده‌سازی به دقیقه'
    },
    is_vegetarian: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    is_vegan: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    is_gluten_free: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    is_spicy: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    spice_level: {
      type: Sequelize.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      },
      comment: 'سطح تندی از 1 تا 5'
    },
    is_available: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    sort_order: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    tags: {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true,
      defaultValue: []
    },
    nutritional_info: {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'اطلاعات تغذیه‌ای'
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
  await queryInterface.addIndex('food_items', ['name'], {
    name: 'food_items_name_idx'
  });

  await queryInterface.addIndex('food_items', ['category_id'], {
    name: 'food_items_category_id_idx'
  });

  await queryInterface.addIndex('food_items', ['price'], {
    name: 'food_items_price_idx'
  });

  await queryInterface.addIndex('food_items', ['is_available'], {
    name: 'food_items_is_available_idx'
  });

  await queryInterface.addIndex('food_items', ['is_active'], {
    name: 'food_items_is_active_idx'
  });

  await queryInterface.addIndex('food_items', ['is_vegetarian'], {
    name: 'food_items_is_vegetarian_idx'
  });

  await queryInterface.addIndex('food_items', ['is_vegan'], {
    name: 'food_items_is_vegan_idx'
  });

  await queryInterface.addIndex('food_items', ['is_gluten_free'], {
    name: 'food_items_is_gluten_free_idx'
  });

  await queryInterface.addIndex('food_items', ['tags'], {
    using: 'gin',
    name: 'food_items_tags_gin_idx'
  });

  await queryInterface.addIndex('food_items', ['nutritional_info'], {
    using: 'gin',
    name: 'food_items_nutritional_info_gin_idx'
  });

  await queryInterface.addIndex('food_items', ['created_by'], {
    name: 'food_items_created_by_idx'
  });

  await queryInterface.addIndex('food_items', ['created_at'], {
    name: 'food_items_created_at_idx'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // حذف جدول
  await queryInterface.dropTable('food_items');

  // حذف enum
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "unit_enum";');
};