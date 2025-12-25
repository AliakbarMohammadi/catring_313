import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * مدل منوی روزانه
 */
export class DailyMenu extends Model {
  /**
   * بررسی اینکه آیا منو منتشر شده است
   * @returns {boolean}
   */
  isPublished() {
    return this.status === 'published';
  }

  /**
   * بررسی اینکه آیا منو پیش‌نویس است
   * @returns {boolean}
   */
  isDraft() {
    return this.status === 'draft';
  }

  /**
   * بررسی اینکه آیا منو آرشیو شده است
   * @returns {boolean}
   */
  isArchived() {
    return this.status === 'archived';
  }

  /**
   * بررسی اینکه آیا منو برای امروز است
   * @returns {boolean}
   */
  isToday() {
    const today = new Date().toISOString().split('T')[0];
    return this.menu_date === today;
  }

  /**
   * بررسی اینکه آیا منو برای آینده است
   * @returns {boolean}
   */
  isFuture() {
    const today = new Date().toISOString().split('T')[0];
    return this.menu_date > today;
  }

  /**
   * منتشر کردن منو
   * @param {string} publishedBy - شناسه کاربر منتشر کننده
   */
  async publish(publishedBy) {
    this.status = 'published';
    this.published_by = publishedBy;
    this.published_at = new Date();
    await this.save();
  }

  /**
   * آرشیو کردن منو
   */
  async archive() {
    this.status = 'archived';
    await this.save();
  }

  /**
   * دریافت آیتم‌های منو
   * @returns {Promise<Array>} - لیست آیتم‌های منو
   */
  async getMenuItems() {
    return await sequelize.models.MenuItem.findAll({
      where: { daily_menu_id: this.id },
      include: [
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
      order: [['sort_order', 'ASC']]
    });
  }

  /**
   * دریافت تعداد سفارشات
   * @returns {Promise<number>} - تعداد سفارشات
   */
  async getOrdersCount() {
    return await sequelize.models.Order.count({
      where: { daily_menu_id: this.id }
    });
  }

  /**
   * جستجوی منوهای روزانه
   * @param {Object} filters - فیلترهای جستجو
   * @returns {Promise<Array>} - لیست منوها
   */
  static async search(filters = {}) {
    const where = {};
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.date_from) {
      where.menu_date = {
        [sequelize.Sequelize.Op.gte]: filters.date_from
      };
    }
    
    if (filters.date_to) {
      where.menu_date = {
        ...where.menu_date,
        [sequelize.Sequelize.Op.lte]: filters.date_to
      };
    }

    return this.findAll({
      where,
      include: [
        {
          model: sequelize.models.User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name']
        },
        {
          model: sequelize.models.User,
          as: 'publisher',
          attributes: ['id', 'first_name', 'last_name']
        }
      ],
      order: [['menu_date', 'DESC']],
      limit: filters.limit || 50,
      offset: filters.offset || 0
    });
  }
}
// تعریف مدل
DailyMenu.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  menu_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    unique: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    allowNull: false,
    defaultValue: 'draft'
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  published_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  published_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'DailyMenu',
  tableName: 'daily_menus',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['menu_date']
    },
    {
      fields: ['status']
    },
    {
      fields: ['created_by']
    },
    {
      fields: ['published_by']
    },
    {
      fields: ['published_at']
    }
  ]
});

export default DailyMenu;