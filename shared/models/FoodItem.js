import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * مدل غذا
 */
export class FoodItem extends Model {
  /**
   * بررسی اینکه آیا غذا فعال است
   * @returns {boolean}
   */
  isActive() {
    return this.status === 'active';
  }

  /**
   * بررسی اینکه آیا غذا موجود است
   * @returns {boolean}
   */
  isAvailable() {
    return this.status === 'active' && this.is_available;
  }

  /**
   * فعال کردن غذا
   */
  async activate() {
    this.status = 'active';
    await this.save();
  }

  /**
   * غیرفعال کردن غذا
   */
  async deactivate() {
    this.status = 'inactive';
    await this.save();
  }

  /**
   * تنظیم موجودی
   * @param {boolean} available - وضعیت موجودی
   */
  async setAvailability(available) {
    this.is_available = available;
    await this.save();
  }

  /**
   * به‌روزرسانی قیمت
   * @param {number} price - قیمت جدید
   */
  async updatePrice(price) {
    this.price = price;
    await this.save();
  }

  /**
   * جستجوی غذاها
   * @param {Object} filters - فیلترهای جستجو
   * @returns {Promise<Array>} - لیست غذاها
   */
  static async search(filters = {}) {
    const where = {};
    
    if (filters.category_id) {
      where.category_id = filters.category_id;
    }
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.is_available !== undefined) {
      where.is_available = filters.is_available;
    }
    
    if (filters.name) {
      where.name = {
        [sequelize.Sequelize.Op.iLike]: `%${filters.name}%`
      };
    }

    return this.findAll({
      where,
      include: [
        {
          model: sequelize.models.FoodCategory,
          as: 'category',
          attributes: ['id', 'name', 'type']
        }
      ],
      order: [['name', 'ASC']],
      limit: filters.limit || 50,
      offset: filters.offset || 0
    });
  }
}
// تعریف مدل
FoodItem.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      len: [1, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'food_categories',
      key: 'id'
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  image_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  ingredients: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  allergens: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  calories: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  preparation_time: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  is_vegetarian: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  is_vegan: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  is_gluten_free: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  is_available: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
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
  modelName: 'FoodItem',
  tableName: 'food_items',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['category_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['is_available']
    },
    {
      fields: ['created_by']
    },
    {
      fields: ['name']
    },
    {
      fields: ['is_vegetarian']
    },
    {
      fields: ['is_vegan']
    },
    {
      fields: ['is_gluten_free']
    }
  ]
});

export default FoodItem;