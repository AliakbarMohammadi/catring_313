import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * مدل اعلان
 */
export class Notification extends Model {
  /**
   * بررسی اینکه آیا اعلان خوانده شده است
   * @returns {boolean}
   */
  isRead() {
    return this.is_read;
  }

  /**
   * بررسی اینکه آیا اعلان ارسال شده است
   * @returns {boolean}
   */
  isSent() {
    return this.status === 'sent';
  }

  /**
   * بررسی اینکه آیا اعلان در انتظار ارسال است
   * @returns {boolean}
   */
  isPending() {
    return this.status === 'pending';
  }

  /**
   * بررسی اینکه آیا ارسال اعلان شکست خورده است
   * @returns {boolean}
   */
  isFailed() {
    return this.status === 'failed';
  }

  /**
   * علامت‌گذاری به عنوان خوانده شده
   */
  async markAsRead() {
    this.is_read = true;
    this.read_at = new Date();
    await this.save();
  }

  /**
   * علامت‌گذاری به عنوان ارسال شده
   */
  async markAsSent() {
    this.status = 'sent';
    this.sent_at = new Date();
    await this.save();
  }

  /**
   * علامت‌گذاری به عنوان شکست خورده
   * @param {string} error - پیام خطا
   */
  async markAsFailed(error) {
    this.status = 'failed';
    this.error_message = error;
    await this.save();
  }

  /**
   * جستجوی اعلان‌ها
   * @param {Object} filters - فیلترهای جستجو
   * @returns {Promise<Array>} - لیست اعلان‌ها
   */
  static async search(filters = {}) {
    const where = {};
    
    if (filters.user_id) where.user_id = filters.user_id;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.is_read !== undefined) where.is_read = filters.is_read;
    
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
        }
      ],
      order: [['created_at', 'DESC']],
      limit: filters.limit || 50,
      offset: filters.offset || 0
    });
  }

  /**
   * دریافت اعلان‌های خوانده نشده کاربر
   * @param {string} userId - شناسه کاربر
   * @returns {Promise<Array>} - لیست اعلان‌های خوانده نشده
   */
  static async getUnreadByUser(userId) {
    return this.findAll({
      where: {
        user_id: userId,
        is_read: false
      },
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * شمارش اعلان‌های خوانده نشده کاربر
   * @param {string} userId - شناسه کاربر
   * @returns {Promise<number>} - تعداد اعلان‌های خوانده نشده
   */
  static async countUnreadByUser(userId) {
    return this.count({
      where: {
        user_id: userId,
        is_read: false
      }
    });
  }
}
// تعریف مدل
Notification.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM(
      'order_confirmed', 'order_cancelled', 'order_ready', 'order_delivered',
      'payment_successful', 'payment_failed', 'invoice_generated',
      'company_approved', 'company_rejected', 'menu_published',
      'system_maintenance', 'account_locked', 'password_reset'
    ),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  data: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  channels: {
    type: DataTypes.ARRAY(DataTypes.ENUM('email', 'sms', 'push', 'in_app')),
    allowNull: false,
    defaultValue: ['in_app']
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'failed'),
    allowNull: false,
    defaultValue: 'pending'
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  scheduled_for: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Notification',
  tableName: 'notifications',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['is_read'] },
    { fields: ['created_at'] },
    { fields: ['scheduled_for'] }
  ]
});

export default Notification;