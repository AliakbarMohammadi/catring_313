import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * مدل آیتم سفارش
 */
export class OrderItem extends Model {
  /**
   * محاسبه مبلغ کل آیتم
   * @returns {number} - مبلغ کل
   */
  getTotalPrice() {
    return parseFloat(this.price) * this.quantity;
  }

  /**
   * به‌روزرسانی تعداد
   * @param {number} quantity - تعداد جدید
   */
  async updateQuantity(quantity) {
    this.quantity = quantity;
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
   * جستجوی آیتم‌های سفارش
   * @param {Object} filters - فیلترهای جستجو
   * @returns {Promise<Array>} - لیست آیتم‌های سفارش
   */
  static async search(filters = {}) {
    const where = {};
    
    if (filters.order_id) {
      where.order_id = filters.order_id;
    }
    
    if (filters.food_item_id) {
      where.food_item_id = filters.food_item_id;
    }
    
    if (filters.menu_item_id) {
      where.menu_item_id = filters.menu_item_id;
    }

    return this.findAll({
      where,
      include: [
        {
          model: sequelize.models.Order,
          as: 'order',
          attributes: ['id', 'order_number', 'status', 'created_at']
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
        },
        {
          model: sequelize.models.MenuItem,
          as: 'menuItem'
        }
      ],
      order: [['created_at', 'DESC']],
      limit: filters.limit || 50,
      offset: filters.offset || 0
    });
  }

  /**
   * تبدیل به JSON با اطلاعات اضافی
   * @returns {Object} - اطلاعات کامل آیتم سفارش
   */
  toDetailedJSON() {
    return {
      ...this.toJSON(),
      total_price: this.getTotalPrice()
    };
  }
}

// تعریف مدل
OrderItem.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  order_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'orders',
      key: 'id'
    }
  },
  menu_item_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'menu_items',
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
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  special_instructions: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'OrderItem',
  tableName: 'order_items',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['order_id']
    },
    {
      fields: ['menu_item_id']
    },
    {
      fields: ['food_item_id']
    }
  ]
});

export default OrderItem;