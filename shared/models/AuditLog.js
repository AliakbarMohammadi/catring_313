import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * مدل لاگ حسابرسی
 */
export class AuditLog extends Model {
  /**
   * ایجاد لاگ جدید
   * @param {Object} logData - اطلاعات لاگ
   * @returns {Promise<Object>} - لاگ ایجاد شده
   */
  static async createLog(logData) {
    return this.create({
      user_id: logData.userId,
      action: logData.action,
      resource_type: logData.resourceType,
      resource_id: logData.resourceId,
      old_values: logData.oldValues,
      new_values: logData.newValues,
      ip_address: logData.ipAddress,
      user_agent: logData.userAgent,
      metadata: logData.metadata
    });
  }

  /**
   * جستجوی لاگ‌ها
   * @param {Object} filters - فیلترهای جستجو
   * @returns {Promise<Array>} - لیست لاگ‌ها
   */
  static async search(filters = {}) {
    const where = {};
    
    if (filters.user_id) where.user_id = filters.user_id;
    if (filters.action) where.action = filters.action;
    if (filters.resource_type) where.resource_type = filters.resource_type;
    if (filters.resource_id) where.resource_id = filters.resource_id;
    
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
      limit: filters.limit || 100,
      offset: filters.offset || 0
    });
  }

  /**
   * دریافت لاگ‌های کاربر خاص
   * @param {string} userId - شناسه کاربر
   * @param {Object} options - تنظیمات اضافی
   * @returns {Promise<Array>} - لیست لاگ‌های کاربر
   */
  static async getUserLogs(userId, options = {}) {
    return this.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: options.limit || 50,
      offset: options.offset || 0
    });
  }

  /**
   * دریافت لاگ‌های منبع خاص
   * @param {string} resourceType - نوع منبع
   * @param {string} resourceId - شناسه منبع
   * @returns {Promise<Array>} - لیست لاگ‌های منبع
   */
  static async getResourceLogs(resourceType, resourceId) {
    return this.findAll({
      where: {
        resource_type: resourceType,
        resource_id: resourceId
      },
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * آمار لاگ‌ها
   * @param {Object} filters - فیلترهای آمار
   * @returns {Promise<Object>} - آمار لاگ‌ها
   */
  static async getStats(filters = {}) {
    const where = {};
    
    if (filters.date_from) {
      where.created_at = { [sequelize.Sequelize.Op.gte]: filters.date_from };
    }
    if (filters.date_to) {
      where.created_at = { 
        ...where.created_at, 
        [sequelize.Sequelize.Op.lte]: filters.date_to 
      };
    }

    const totalLogs = await this.count({ where });
    
    const actionStats = await this.findAll({
      where,
      attributes: [
        'action',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['action'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
    });

    const resourceStats = await this.findAll({
      where,
      attributes: [
        'resource_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['resource_type'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
    });

    return {
      total_logs: totalLogs,
      actions: actionStats.map(stat => ({
        action: stat.action,
        count: parseInt(stat.dataValues.count)
      })),
      resources: resourceStats.map(stat => ({
        resource_type: stat.resource_type,
        count: parseInt(stat.dataValues.count)
      }))
    };
  }
}
// تعریف مدل
AuditLog.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  action: {
    type: DataTypes.ENUM(
      'create', 'read', 'update', 'delete', 'login', 'logout',
      'password_change', 'email_verification', 'password_reset',
      'order_place', 'order_cancel', 'payment_process', 'invoice_generate'
    ),
    allowNull: false
  },
  resource_type: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  resource_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  old_values: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  new_values: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  ip_address: {
    type: DataTypes.INET,
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'AuditLog',
  tableName: 'audit_logs',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['action'] },
    { fields: ['resource_type'] },
    { fields: ['resource_id'] },
    { fields: ['created_at'] },
    { fields: ['resource_type', 'resource_id'] }
  ]
});

export default AuditLog;