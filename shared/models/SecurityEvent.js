import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * مدل رویداد امنیتی
 */
export class SecurityEvent extends Model {
  /**
   * بررسی وضعیت رویداد
   */
  isOpen() { return this.status === 'open'; }
  isInvestigating() { return this.status === 'investigating'; }
  isResolved() { return this.status === 'resolved'; }
  isFalsePositive() { return this.status === 'false_positive'; }

  /**
   * بررسی سطح خطر
   */
  isLowRisk() { return this.severity === 'low'; }
  isMediumRisk() { return this.severity === 'medium'; }
  isHighRisk() { return this.severity === 'high'; }
  isCriticalRisk() { return this.severity === 'critical'; }

  /**
   * شروع بررسی
   * @param {string} investigatedBy - شناسه بررسی کننده
   */
  async startInvestigation(investigatedBy) {
    this.status = 'investigating';
    this.investigated_by = investigatedBy;
    this.investigated_at = new Date();
    await this.save();
  }

  /**
   * حل رویداد
   * @param {string} resolvedBy - شناسه حل کننده
   * @param {string} resolution - توضیحات حل
   */
  async resolve(resolvedBy, resolution) {
    this.status = 'resolved';
    this.resolved_by = resolvedBy;
    this.resolved_at = new Date();
    this.resolution = resolution;
    await this.save();
  }

  /**
   * علامت‌گذاری به عنوان مثبت کاذب
   * @param {string} resolvedBy - شناسه حل کننده
   * @param {string} reason - دلیل مثبت کاذب بودن
   */
  async markAsFalsePositive(resolvedBy, reason) {
    this.status = 'false_positive';
    this.resolved_by = resolvedBy;
    this.resolved_at = new Date();
    this.resolution = reason;
    await this.save();
  }

  /**
   * ایجاد رویداد امنیتی جدید
   * @param {Object} eventData - اطلاعات رویداد
   * @returns {Promise<Object>} - رویداد ایجاد شده
   */
  static async createEvent(eventData) {
    return this.create({
      user_id: eventData.userId,
      event_type: eventData.eventType,
      severity: eventData.severity,
      description: eventData.description,
      ip_address: eventData.ipAddress,
      user_agent: eventData.userAgent,
      metadata: eventData.metadata,
      detected_at: eventData.detectedAt || new Date()
    });
  }

  /**
   * جستجوی رویدادهای امنیتی
   * @param {Object} filters - فیلترهای جستجو
   * @returns {Promise<Array>} - لیست رویدادها
   */
  static async search(filters = {}) {
    const where = {};
    
    if (filters.user_id) where.user_id = filters.user_id;
    if (filters.event_type) where.event_type = filters.event_type;
    if (filters.severity) where.severity = filters.severity;
    if (filters.status) where.status = filters.status;
    
    if (filters.date_from) {
      where.detected_at = { [sequelize.Sequelize.Op.gte]: filters.date_from };
    }
    if (filters.date_to) {
      where.detected_at = { 
        ...where.detected_at, 
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
          model: sequelize.models.User,
          as: 'investigator',
          attributes: ['id', 'first_name', 'last_name']
        },
        {
          model: sequelize.models.User,
          as: 'resolver',
          attributes: ['id', 'first_name', 'last_name']
        }
      ],
      order: [['detected_at', 'DESC']],
      limit: filters.limit || 50,
      offset: filters.offset || 0
    });
  }

  /**
   * دریافت رویدادهای باز
   * @returns {Promise<Array>} - لیست رویدادهای باز
   */
  static async getOpenEvents() {
    return this.findAll({
      where: { status: 'open' },
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      order: [['severity', 'DESC'], ['detected_at', 'DESC']]
    });
  }

  /**
   * آمار رویدادهای امنیتی
   * @param {Object} filters - فیلترهای آمار
   * @returns {Promise<Object>} - آمار رویدادها
   */
  static async getStats(filters = {}) {
    const where = {};
    
    if (filters.date_from) {
      where.detected_at = { [sequelize.Sequelize.Op.gte]: filters.date_from };
    }
    if (filters.date_to) {
      where.detected_at = { 
        ...where.detected_at, 
        [sequelize.Sequelize.Op.lte]: filters.date_to 
      };
    }

    const totalEvents = await this.count({ where });
    const openEvents = await this.count({ where: { ...where, status: 'open' } });
    const criticalEvents = await this.count({ where: { ...where, severity: 'critical' } });

    const severityStats = await this.findAll({
      where,
      attributes: [
        'severity',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['severity']
    });

    const typeStats = await this.findAll({
      where,
      attributes: [
        'event_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['event_type'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
    });

    return {
      total_events: totalEvents,
      open_events: openEvents,
      critical_events: criticalEvents,
      severity_breakdown: severityStats.map(stat => ({
        severity: stat.severity,
        count: parseInt(stat.dataValues.count)
      })),
      type_breakdown: typeStats.map(stat => ({
        event_type: stat.event_type,
        count: parseInt(stat.dataValues.count)
      }))
    };
  }
}
// تعریف مدل
SecurityEvent.init({
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
  event_type: {
    type: DataTypes.ENUM(
      'failed_login', 'suspicious_activity', 'data_breach_attempt',
      'unauthorized_access', 'privilege_escalation', 'malicious_request',
      'account_lockout', 'password_brute_force', 'sql_injection_attempt',
      'xss_attempt', 'csrf_attempt', 'rate_limit_exceeded'
    ),
    allowNull: false
  },
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false,
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('open', 'investigating', 'resolved', 'false_positive'),
    allowNull: false,
    defaultValue: 'open'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
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
  },
  detected_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  investigated_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  investigated_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolved_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolution: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'SecurityEvent',
  tableName: 'security_events',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['event_type'] },
    { fields: ['severity'] },
    { fields: ['status'] },
    { fields: ['detected_at'] },
    { fields: ['investigated_by'] },
    { fields: ['resolved_by'] },
    { fields: ['ip_address'] }
  ]
});

export default SecurityEvent;