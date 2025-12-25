/**
 * Migration: ایجاد جدول دسته‌بندی غذاها
 */

export const up = async (queryInterface, Sequelize) => {
  // ایجاد جدول دسته‌بندی غذاها
  await queryInterface.createTable('food_categories', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: Sequelize.STRING(100),
      allowNull: false
    },
    name_en: {
      type: Sequelize.STRING(100),
      allowNull: true
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    icon: {
      type: Sequelize.STRING(255),
      allowNull: true
    },
    color: {
      type: Sequelize.STRING(7),
      allowNull: true,
      defaultValue: '#000000'
    },
    sort_order: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
  await queryInterface.addIndex('food_categories', ['name'], {
    name: 'food_categories_name_idx'
  });

  await queryInterface.addIndex('food_categories', ['is_active'], {
    name: 'food_categories_is_active_idx'
  });

  await queryInterface.addIndex('food_categories', ['sort_order'], {
    name: 'food_categories_sort_order_idx'
  });

  await queryInterface.addIndex('food_categories', ['created_by'], {
    name: 'food_categories_created_by_idx'
  });

  // درج دسته‌بندی‌های پیش‌فرض
  await queryInterface.bulkInsert('food_categories', [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'غذای اصلی',
      name_en: 'Main Course',
      description: 'غذاهای اصلی شامل برنج، خورشت و کباب',
      icon: 'main-dish',
      color: '#FF6B35',
      sort_order: 1,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'پیش غذا',
      name_en: 'Appetizer',
      description: 'سالاد، ماست و پیش غذاهای مختلف',
      icon: 'appetizer',
      color: '#4ECDC4',
      sort_order: 2,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      name: 'نوشیدنی',
      name_en: 'Beverage',
      description: 'آب، نوشابه، آبمیوه و نوشیدنی‌های گرم',
      icon: 'beverage',
      color: '#45B7D1',
      sort_order: 3,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440004',
      name: 'دسر',
      name_en: 'Dessert',
      description: 'شیرینی، بستنی و دسرهای مختلف',
      icon: 'dessert',
      color: '#F7DC6F',
      sort_order: 4,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440005',
      name: 'میان وعده',
      name_en: 'Snack',
      description: 'تنقلات، ساندویچ و میان وعده‌های سبک',
      icon: 'snack',
      color: '#BB8FCE',
      sort_order: 5,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
};

export const down = async (queryInterface, Sequelize) => {
  // حذف جدول
  await queryInterface.dropTable('food_categories');
};