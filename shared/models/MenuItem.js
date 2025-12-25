import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * مدل آیتم منو
 */
export class MenuItem extends Model {
  /**
   * بررسی اینکه آیا آیتم موجود است
   * @returns {boolean}
   */
  isAvailable() {
    return this.is_available && this.quantity_available > 0;
  }

  /**
   * بررسی اینکه آیا آیتم تمام شده است
   * @returns {boolean}
   */
  isOutOfStock() {
    return this.quantity_available <= 0;
  }

  /**
   * کاهش موجودی
   * @param {number} quantity - مقدار کاهش
   * @returns {boolean} - موفقیت عملیات
   */
  async decreaseQuantity(quantity) {
    if (this.quantity_available >= quantity) {
      this.quantity_available -= quantity;
      await this.save();
      return true;
    }
    return false;
  }

  /**
   * افزایش موجودی
   * @param {number} quantity - مقدار افزایش
   */
  async increaseQuantity(quantity) {
    this.quantity_available += quantity;
    await this.save();
  }

  /**
   * تنظیم موجودی
   * @param {number} quantity - موجودی جدید
   */
  async setQuantity(quantity) {
    this.quantity_available = quantity;
    await this.save();
  }

  /**
   * تنظیم وضعیت موجودی
   * @param {boolean} available - وضعیت موجودی
   */
  async setAvailability(available) {
    this.is_available = available;
    await this.save();
  }

  /**
   * دریافت اطلاعات غذا
   * @returns {Promise<Object>} - اطلاعات غذا
   */
  async getFoodItemInfo() {
    const foodItem = await this.getFoodItem({
      include: [
        {
          model: sequelize.models.FoodCategory,
          as: 'category'
        }
      ]
    });
    return foodItem ? foodItem.toJSON() : null;
  }

  /**
   * جستجوی آیتم‌های منو
   * @param {Object} filters - فیلترهای جستجو
   * @returns {Promise<Array>} - لیست آیتم‌های منو
   */
  static async search(filters = {}) {
    const where = {};
    
    if (filters.daily_menu_id) {
      where.daily_menu_id = filters.daily_menu_id;
    }
    
    if (filters.food_item_id) {
      where.food_item_id = filters.food_item_id;
    }
    
    if (filters.is_available !== undefined) {
      where.is_available = filters.is_available;
    }

    return this.findAll({
      where,
      include: [
        {
          model: sequelize.models.DailyMenu,
          as: 'dailyMenu',
          attributes: ['id', 'menu_date', 'title', 'status']
        },
        {
          model: sequelize.models.FoodItem,
          as: 'foodItem',
          include: [
            {
              model: sequelize.models.FoodCategory,
              as: 'category'
            }
          ]
        }
      ],
      order: [['sort_order', 'ASC']],
      limit: filters.limit || 50,
      offset: filters.offset || 0
    });
  }
}
// تعریف مدل
MenuItem.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  daily_menu_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'daily_menus',
      key: 'id'
    }
  },
  food_item_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'food_items',
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
  quantity_available: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  is_available: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  sort_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  special_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'MenuItem',
  tableName: 'menu_items',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['daily_menu_id', 'food_item_id']
    },
    {
      fields: ['daily_menu_id']
    },
    {
      fields: ['food_item_id']
    },
    {
      fields: ['is_available']
    },
    {
      fields: ['sort_order']
    }
  ]
});

export default MenuItem;