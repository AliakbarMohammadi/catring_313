import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * مدل تنظیمات اعلان
 */
export class NotificationPreference extends Model {
  /**
   * بررسی اینکه آیا کانال خاصی فعال است
   * @param {string} channel - نام کانال
   * @returns {boolean}
   */
  isChannelEnabled(channel) {
    switch (channel) {
      case 'email':
        return this.email_enabled;
      case 'sms':
        return this.sms_enabled;
      case 'push':
        return this.push_enabled;
      case 'in_app':
        return this.in_app_enabled;
      default:
        return false;
    }
  }

  /**
   * بررسی اینکه آیا نوع اعلان خاصی فعال است
   * @param {string} type - نوع اعلان
   * @returns {boolean}
   */
  isNotificationTypeEnabled(type) {
    const typeSettings = this.notification_types || {};
    return typeSettings[type] !== false;
  }

  /**
   * فعال/غیرفعال کردن کانال
   * @param {string} channel - نام کانال
   * @param {boolean} enabled - وضعیت فعال/غیرفعال
   */
  async setChannelEnabled(channel, enabled) {
    switch (channel) {
      case 'email':
        this.email_enabled = enabled;
        break;
      case 'sms':
        this.sms_enabled = enabled;
        break;
      case 'push':
        this.push_enabled = enabled;
        break;
      case 'in_app':
        this.in_app_enabled = enabled;
        break;
    }
    await this.save();
  }

  /**
   * تنظیم وضعیت نوع اعلان
   * @param {string} type - نوع اعلان
   * @param {boolean} enabled - وضعیت فعال/غیرفعال
   */
  async setNotificationTypeEnabled(type, enabled) {
    const typeSettings = this.notification_types || {};
    typeSettings[type] = enabled;
    this.notification_types = typeSettings;
    await this.save();
  }

  /**
   * دریافت تنظیمات کاربر
   * @param {string} userId - شناسه کاربر
   * @returns {Promise<Object>} - تنظیمات اعلان
   */
  static async getByUserId(userId) {
    let preferences = await this.findOne({
      where: { user_id: userId }
    });

    if (!preferences) {
      preferences = await this.create({
        user_id: userId
      });
    }

    return preferences;
  }

  /**
   * به‌روزرسانی تنظیمات کاربر
   * @param {string} userId - شناسه کاربر
   * @param {Object} settings - تنظیمات جدید
   * @returns {Promise<Object>} - تنظیمات به‌روزرسانی شده
   */
  static async updateByUserId(userId, settings) {
    const preferences = await this.getByUserId(userId);
    
    Object.keys(settings).forEach(key => {
      if (preferences[key] !== undefined) {
        preferences[key] = settings[key];
      }
    });

    await preferences.save();
    return preferences;
  }
}

// تعریف مدل
NotificationPreference.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  email_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  sms_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  push_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  in_app_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  notification_types: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      order_confirmed: true,
      order_cancelled: true,
      order_ready: true,
      order_delivered: true,
      payment_successful: true,
      payment_failed: true,
      invoice_generated: true,
      company_approved: true,
      company_rejected: true,
      menu_published: true,
      system_maintenance: true,
      account_locked: true,
      password_reset: true
    }
  },
  quiet_hours_start: {
    type: DataTypes.TIME,
    allowNull: true
  },
  quiet_hours_end: {
    type: DataTypes.TIME,
    allowNull: true
  },
  timezone: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Asia/Tehran'
  }
}, {
  sequelize,
  modelName: 'NotificationPreference',
  tableName: 'notification_preferences',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id']
    }
  ]
});

export default NotificationPreference;