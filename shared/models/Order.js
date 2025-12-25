import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * مدل سفارش
 */
export class Order extends Model {
  /**
   * بررسی وضعیت سفارش
   */
  isPending() { return this.status === 'pending'; }
  isConfirmed() { return this.status === 'confirmed'; }
  isPreparing() { return this.status === 'preparing'; }
  isReady() { return this.status === 'ready'; }
  isDelivered() { return this.status === 'delivered'; }
  isCancelled() { return this.status === 'cancelled'; }

  /**
   * تأیید سفارش
   */
  async confirm() {
    this.status = 'confirmed';
    this.confirmed_at = new Date();
    await this.save();
  }

  /**
   * لغو سفارش
   * @param {string} cancelledBy - شناسه کاربر لغو کننده
   * @param {string} reason - دلیل لغو
   */
  async cancel(cancelledBy, reason) {
    this.status = 'cancelled';
    this.cancelled_by = cancelledBy;
    this.cancelled_at = new Date();
    this.cancellation_reason = reason;
    await this.save();
  }

  /**
   * محاسبه مجموع مبلغ
   * @returns {Promise<number>} - مجموع مبلغ
   */
  async calculateTotal() {
    const orderItems = await this.getOrderItems();
    const subtotal = orderItems.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * item.quantity);
    }, 0);
    
    const tax = subtotal * (this.tax_rate / 100);
    const discount = this.discount_amount || 0;
    const total = subtotal + tax - discount;
    
    return Math.max(0, total);
  }

  /**
   * به‌روزرسانی مبلغ کل
   */
  async updateTotalAmount() {
    this.total_amount = await this.calculateTotal();
    await this.save();
  }

  /**
   * دریافت آیتم‌های سفارش
   * @returns {Promise<Array>} - لیست آیتم‌های سفارش
   */
  async getOrderItems() {
    return await sequelize.models.OrderItem.findAll({
      where: { order_id: this.id },
      include: [
        {
          model: sequelize.models.FoodItem,
          as: 'foodItem'
        },
        {
          model: sequelize.models.MenuItem,
          as: 'menuItem'
        }
      ]
    });
  }

  /**
   * جستجوی سفارشات
   * @param {Object} filters - فیلترهای جستجو
   * @returns {Promise<Array>} - لیست سفارشات
   */
  static async search(filters = {}) {
    const where = {};
    
    if (filters.user_id) where.user_id = filters.user_id;
    if (filters.company_id) where.company_id = filters.company_id;
    if (filters.status) where.status = filters.status;
    if (filters.daily_menu_id) where.daily_menu_id = filters.daily_menu_id;
    
    if (filters.date_from) {
      where.created_at = { [sequelize.Sequelize.Op.gte]: filters.date_from };
    }
    if (filters.date_to) {
      where.created_at = { 
        ...where.created_at, 
        [sequelize.Sequelize.Op.lte]: filters.date_to 
      };
    }

    return this.findAll({
      where,
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: sequelize.models.Company,
          as: 'company',
          attributes: ['id', 'name', 'company_code']
        },
        {
          model: sequelize.models.DailyMenu,
          as: 'dailyMenu',
          attributes: ['id', 'menu_date', 'title']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: filters.limit || 50,
      offset: filters.offset || 0
    });
  }
}
// تعریف مدل
Order.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  order_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  company_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'companies',
      key: 'id'
    }
  },
  daily_menu_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'daily_menus',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  tax_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 9.00,
    validate: {
      min: 0,
      max: 100
    }
  },
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  delivery_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  delivery_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  confirmed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelled_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancellation_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Order',
  tableName: 'orders',
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['order_number'] },
    { fields: ['user_id'] },
    { fields: ['company_id'] },
    { fields: ['daily_menu_id'] },
    { fields: ['status'] },
    { fields: ['created_at'] },
    { fields: ['cancelled_by'] }
  ],
  hooks: {
    beforeCreate: async (order) => {
      if (!order.order_number) {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        order.order_number = `ORD-${date}-${random}`;
      }
    }
  }
});

export default Order;