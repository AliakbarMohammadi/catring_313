import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * مدل کارمند
 */
export class Employee extends Model {
  /**
   * بررسی اینکه آیا کارمند فعال است
   * @returns {boolean}
   */
  isActive() {
    return this.status === 'active';
  }

  /**
   * بررسی اینکه آیا کارمند تعلیق شده است
   * @returns {boolean}
   */
  isSuspended() {
    return this.status === 'suspended';
  }

  /**
   * بررسی اینکه آیا کارمند غیرفعال است
   * @returns {boolean}
   */
  isInactive() {
    return this.status === 'inactive';
  }

  /**
   * فعال کردن کارمند
   */
  async activate() {
    this.status = 'active';
    await this.save();
  }

  /**
   * تعلیق کارمند
   * @param {string} reason - دلیل تعلیق
   */
  async suspend(reason) {
    this.status = 'suspended';
    this.notes = reason;
    await this.save();
  }

  /**
   * غیرفعال کردن کارمند
   */
  async deactivate() {
    this.status = 'inactive';
    await this.save();
  }

  /**
   * دریافت نام کامل
   * @returns {string} - نام کامل
   */
  getFullName() {
    return `${this.first_name} ${this.last_name}`.trim();
  }

  /**
   * دریافت اطلاعات کاربر مرتبط
   * @returns {Promise<Object>} - اطلاعات کاربر
   */
  async getUserInfo() {
    const user = await this.getUser();
    return user ? user.toSafeJSON() : null;
  }

  /**
   * دریافت اطلاعات شرکت مرتبط
   * @returns {Promise<Object>} - اطلاعات شرکت
   */
  async getCompanyInfo() {
    const company = await this.getCompany();
    return company ? company.toJSON() : null;
  }

  /**
   * جستجوی کارمندان
   * @param {Object} filters - فیلترهای جستجو
   * @returns {Promise<Array>} - لیست کارمندان
   */
  static async search(filters = {}) {
    const where = {};
    
    if (filters.company_id) {
      where.company_id = filters.company_id;
    }
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.department) {
      where.department = {
        [sequelize.Sequelize.Op.iLike]: `%${filters.department}%`
      };
    }
    
    if (filters.position) {
      where.position = {
        [sequelize.Sequelize.Op.iLike]: `%${filters.position}%`
      };
    }

    if (filters.name) {
      where[sequelize.Sequelize.Op.or] = [
        {
          first_name: {
            [sequelize.Sequelize.Op.iLike]: `%${filters.name}%`
          }
        },
        {
          last_name: {
            [sequelize.Sequelize.Op.iLike]: `%${filters.name}%`
          }
        }
      ];
    }

    return this.findAll({
      where,
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'email', 'phone', 'status']
        },
        {
          model: sequelize.models.Company,
          as: 'company',
          attributes: ['id', 'name', 'company_code']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: filters.limit || 50,
      offset: filters.offset || 0
    });
  }

  /**
   * دریافت آمار کارمند
   * @returns {Object} - آمار کارمند
   */
  async getStats() {
    const orders = await sequelize.models.Order.count({
      where: { user_id: this.user_id }
    });

    const totalSpent = await sequelize.models.Order.sum('total_amount', {
      where: { 
        user_id: this.user_id,
        status: ['confirmed', 'delivered']
      }
    });

    const lastOrder = await sequelize.models.Order.findOne({
      where: { user_id: this.user_id },
      order: [['created_at', 'DESC']]
    });

    return {
      total_orders: orders,
      total_spent: totalSpent || 0,
      last_order_date: lastOrder ? lastOrder.created_at : null
    };
  }

  /**
   * تبدیل به JSON با اطلاعات اضافی
   * @returns {Object} - اطلاعات کامل کارمند
   */
  toDetailedJSON() {
    return {
      ...this.toJSON(),
      full_name: this.getFullName(),
      is_active: this.isActive(),
      is_suspended: this.isSuspended(),
      is_inactive: this.isInactive()
    };
  }
}

// تعریف مدل
Employee.init({
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
  company_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'id'
    }
  },
  employee_code: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100]
    }
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100]
    }
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  position: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  hire_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    allowNull: false,
    defaultValue: 'active'
  },
  added_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Employee',
  tableName: 'employees',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id']
    },
    {
      unique: true,
      fields: ['company_id', 'employee_code']
    },
    {
      fields: ['company_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['added_by']
    },
    {
      fields: ['department']
    },
    {
      fields: ['position']
    }
  ]
});

export default Employee;