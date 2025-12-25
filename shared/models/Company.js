import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * مدل شرکت
 */
export class Company extends Model {
  /**
   * بررسی اینکه آیا شرکت تأیید شده است
   * @returns {boolean}
   */
  isApproved() {
    return this.status === 'approved';
  }

  /**
   * بررسی اینکه آیا شرکت در انتظار تأیید است
   * @returns {boolean}
   */
  isPending() {
    return this.status === 'pending';
  }

  /**
   * بررسی اینکه آیا شرکت رد شده است
   * @returns {boolean}
   */
  isRejected() {
    return this.status === 'rejected';
  }

  /**
   * بررسی اینکه آیا شرکت تعلیق شده است
   * @returns {boolean}
   */
  isSuspended() {
    return this.status === 'suspended';
  }

  /**
   * بررسی اینکه آیا می‌توان کارمند جدید اضافه کرد
   * @returns {boolean}
   */
  canAddEmployee() {
    if (!this.max_employees) return true;
    return this.employee_count < this.max_employees;
  }

  /**
   * افزایش تعداد کارمندان
   */
  async incrementEmployeeCount() {
    this.employee_count += 1;
    await this.save();
  }

  /**
   * کاهش تعداد کارمندان
   */
  async decrementEmployeeCount() {
    if (this.employee_count > 0) {
      this.employee_count -= 1;
      await this.save();
    }
  }

  /**
   * تأیید شرکت
   * @param {string} approvedBy - شناسه کاربر تأیید کننده
   */
  async approve(approvedBy) {
    this.status = 'approved';
    this.approved_by = approvedBy;
    this.approved_at = new Date();
    this.rejection_reason = null;
    await this.save();
  }

  /**
   * رد شرکت
   * @param {string} reason - دلیل رد
   */
  async reject(reason) {
    this.status = 'rejected';
    this.rejection_reason = reason;
    this.approved_by = null;
    this.approved_at = null;
    await this.save();
  }

  /**
   * تعلیق شرکت
   * @param {string} reason - دلیل تعلیق
   */
  async suspend(reason) {
    this.status = 'suspended';
    this.rejection_reason = reason;
    await this.save();
  }

  /**
   * بررسی انقضای اشتراک
   * @returns {boolean}
   */
  isSubscriptionExpired() {
    if (!this.subscription_expires_at) return false;
    return new Date() > this.subscription_expires_at;
  }

  /**
   * تمدید اشتراک
   * @param {number} months - تعداد ماه تمدید
   */
  async extendSubscription(months = 12) {
    const currentExpiry = this.subscription_expires_at || new Date();
    const newExpiry = new Date(currentExpiry);
    newExpiry.setMonth(newExpiry.getMonth() + months);
    
    this.subscription_expires_at = newExpiry;
    await this.save();
  }

  /**
   * تولید کد شرکت یکتا
   * @param {string} name - نام شرکت
   * @returns {string} - کد شرکت
   */
  static generateCompanyCode(name) {
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const prefix = cleanName.substring(0, 6).padEnd(6, 'X');
    const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}${suffix}`;
  }

  /**
   * جستجوی شرکت‌ها
   * @param {Object} filters - فیلترهای جستجو
   * @returns {Promise<Array>} - لیست شرکت‌ها
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
    
    if (filters.city) {
      where.city = {
        [sequelize.Sequelize.Op.iLike]: `%${filters.city}%`
      };
    }
    
    if (filters.subscription_plan) {
      where.subscription_plan = filters.subscription_plan;
    }

    return this.findAll({
      where,
      include: [
        {
          model: sequelize.models.User,
          as: 'admin',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: filters.limit || 50,
      offset: filters.offset || 0
    });
  }

  /**
   * دریافت آمار شرکت
   * @returns {Object} - آمار شرکت
   */
  async getStats() {
    const employees = await sequelize.models.Employee.count({
      where: { company_id: this.id, status: 'active' }
    });

    const orders = await sequelize.models.Order.count({
      where: { company_id: this.id }
    });

    const totalSpent = await sequelize.models.Order.sum('total_amount', {
      where: { 
        company_id: this.id,
        status: ['confirmed', 'delivered']
      }
    });

    return {
      active_employees: employees,
      total_orders: orders,
      total_spent: totalSpent || 0,
      subscription_status: this.isSubscriptionExpired() ? 'expired' : 'active'
    };
  }

  /**
   * تبدیل به JSON با اطلاعات اضافی
   * @returns {Object} - اطلاعات کامل شرکت
   */
  toDetailedJSON() {
    return {
      ...this.toJSON(),
      is_approved: this.isApproved(),
      is_pending: this.isPending(),
      is_rejected: this.isRejected(),
      is_suspended: this.isSuspended(),
      can_add_employee: this.canAddEmployee(),
      subscription_expired: this.isSubscriptionExpired()
    };
  }
}

// تعریف مدل
Company.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [2, 255]
    }
  },
  registration_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true
  },
  tax_id: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  postal_code: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: /^\d{10}$/
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: /^[+]?[\d\s\-()]+$/
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  website: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  company_code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  admin_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'suspended'),
    allowNull: false,
    defaultValue: 'pending'
  },
  approved_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  employee_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  max_employees: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1
    }
  },
  subscription_plan: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'basic',
    validate: {
      isIn: [['basic', 'premium', 'enterprise']]
    }
  },
  subscription_expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Company',
  tableName: 'companies',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['company_code']
    },
    {
      unique: true,
      fields: ['registration_number']
    },
    {
      fields: ['admin_user_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['approved_by']
    },
    {
      fields: ['subscription_plan']
    },
    {
      fields: ['city']
    }
  ],
  hooks: {
    beforeCreate: async (company) => {
      if (!company.company_code) {
        company.company_code = Company.generateCompanyCode(company.name);
      }
    }
  }
});

export default Company;