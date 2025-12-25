import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * مدل دسته‌بندی غذا
 */
export class FoodCategory extends Model {
  /**
   * بررسی اینکه آیا دسته‌بندی فعال است
   * @returns {boolean}
   */
  isActive() {
    return this.status === 'active';
  }

  /**
   * بررسی اینکه آیا دسته‌بندی غیرفعال است
   * @returns {boolean}
   */
  isInactive() {
    return this.status === 'inactive';
  }

  /**
   * فعال کردن دسته‌بندی
   */
  async activate() {
    this.status = 'active';
    await this.save();
  }

  /**
   * غیرفعال کردن دسته‌بندی
   */
  async deactivate() {
    this.status = 'inactive';
    await this.save();
  }

  /**
   * دریافت تعداد غذاهای فعال در این دسته‌بندی
   * @returns {Promise<number>} - تعداد غذاها
   */
  async getActiveFoodItemsCount() {
    return await sequelize.models.FoodItem.count({
      where: {
        category_id: this.id,
        status: 'active'
      }
    });
  }

  /**
   * دریافت غذاهای این دسته‌بندی
   * @param {Object} options - تنظیمات جستجو
   * @returns {Promise<Array>} - لیست غذاها
   */
  async getFoodItems(options = {}) {
    const where = { category_id: this.id };
    
    if (options.status) {
      where.status = options.status;
    }

    return await sequelize.models.FoodItem.findAll({
      where,
      order: [['name', 'ASC']],
      limit: options.limit,
      offset: options.offset
    });
  }

  /**
   * جستجوی دسته‌بندی‌ها
   * @param {Object} filters - فیلترهای جستجو
   * @returns {Promise<Array>} - لیست دسته‌بندی‌ها
   */
  static async search(filters = {}) {
    const where = {};
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.name) {
      where.name = {
        [sequelize.Sequelize.Op.iLike]: `%${filters.name}%`
      };
    }
    
    if (filters.type) {
      where.type = filters.type;
    }

    return this.findAll({
      where,
      include: [
        {
          model: sequelize.models.User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name']
        }
      ],
      order: [['sort_order', 'ASC'], ['name', 'ASC']],
      limit: filters.limit || 50,
      offset: filters.offset || 0
    });
  }

  /**
   * دریافت دسته‌بندی‌های فعال با تعداد غذاها
   * @returns {Promise<Array>} - لیست دسته‌بندی‌ها با آمار
   */
  static async getActiveWithStats() {
    const categories = await this.findAll({
      where: { status: 'active' },
      order: [['sort_order', 'ASC'], ['name', 'ASC']]
    });

    const categoriesWithStats = await Promise.all(
      categories.map(async (category) => {
        const foodItemsCount = await category.getActiveFoodItemsCount();
        return {
          ...category.toJSON(),
          food_items_count: foodItemsCount
        };
      })
    );

    return categoriesWithStats;
  }

  /**
   * تنظیم ترتیب نمایش
   * @param {number} order - ترتیب جدید
   */
  async setSortOrder(order) {
    this.sort_order = order;
    await this.save();
  }

  /**
   * تبدیل به JSON با اطلاعات اضافی
   * @returns {Object} - اطلاعات کامل دسته‌بندی
   */
  toDetailedJSON() {
    return {
      ...this.toJSON(),
      is_active: this.isActive(),
      is_inactive: this.isInactive()
    };
  }
}

// تعریف مدل
FoodCategory.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('main_course', 'appetizer', 'dessert', 'beverage', 'side_dish'),
    allowNull: false,
    defaultValue: 'main_course'
  },
  image_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  sort_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active'
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: 'FoodCategory',
  tableName: 'food_categories',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['type']
    },
    {
      fields: ['sort_order']
    },
    {
      fields: ['created_by']
    },
    {
      fields: ['name']
    }
  ]
});

export default FoodCategory;