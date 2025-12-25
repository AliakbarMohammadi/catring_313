import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * مدل فاکتور
 */
export class Invoice extends Model {
  /**
   * بررسی وضعیت فاکتور
   */
  isDraft() { return this.status === 'draft'; }
  isSent() { return this.status === 'sent'; }
  isPaid() { return this.status === 'paid'; }
  isOverdue() { return this.status === 'overdue'; }
  isCancelled() { return this.status === 'cancelled'; }

  /**
   * ارسال فاکتور
   */
  async send() {
    this.status = 'sent';
    this.sent_at = new Date();
    await this.save();
  }

  /**
   * پرداخت فاکتور
   */
  async markAsPaid() {
    this.status = 'paid';
    this.paid_at = new Date();
    await this.save();
  }

  /**
   * لغو فاکتور
   */
  async cancel() {
    this.status = 'cancelled';
    await this.save();
  }

  /**
   * بررسی سررسید
   * @returns {boolean} - آیا سررسید گذشته است
   */
  isExpired() {
    if (!this.due_date) return false;
    return new Date() > this.due_date;
  }

  /**
   * تولید شماره فاکتور
   * @returns {string} - شماره فاکتور
   */
  static generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `INV-${year}${month}-${random}`;
  }

  /**
   * جستجوی فاکتورها
   * @param {Object} filters - فیلترهای جستجو
   * @returns {Promise<Array>} - لیست فاکتورها
   */
  static async search(filters = {}) {
    const where = {};
    
    if (filters.user_id) where.user_id = filters.user_id;
    if (filters.company_id) where.company_id = filters.company_id;
    if (filters.order_id) where.order_id = filters.order_id;
    if (filters.status) where.status = filters.status;
    if (filters.invoice_type) where.invoice_type = filters.invoice_type;
    
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
          model: sequelize.models.Order,
          as: 'order',
          attributes: ['id', 'order_number']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: filters.limit || 50,
      offset: filters.offset || 0
    });
  }
}
// تعریف مدل
Invoice.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  invoice_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
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
  order_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'orders',
      key: 'id'
    }
  },
  invoice_type: {
    type: DataTypes.ENUM('individual', 'company_monthly', 'company_order'),
    allowNull: false,
    defaultValue: 'individual'
  },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled'),
    allowNull: false,
    defaultValue: 'draft'
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
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
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  due_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  period_start: {
    type: DataTypes.DATE,
    allowNull: true
  },
  period_end: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: 'Invoice',
  tableName: 'invoices',
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['invoice_number'] },
    { fields: ['user_id'] },
    { fields: ['company_id'] },
    { fields: ['order_id'] },
    { fields: ['status'] },
    { fields: ['invoice_type'] },
    { fields: ['created_at'] },
    { fields: ['due_date'] },
    { fields: ['created_by'] }
  ],
  hooks: {
    beforeCreate: async (invoice) => {
      if (!invoice.invoice_number) {
        invoice.invoice_number = Invoice.generateInvoiceNumber();
      }
    }
  }
});

export default Invoice;