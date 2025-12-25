import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * مدل پرداخت
 */
export class Payment extends Model {
  /**
   * بررسی وضعیت پرداخت
   */
  isPending() { return this.status === 'pending'; }
  isCompleted() { return this.status === 'completed'; }
  isFailed() { return this.status === 'failed'; }
  isRefunded() { return this.status === 'refunded'; }

  /**
   * تکمیل پرداخت
   * @param {string} transactionId - شناسه تراکنش
   */
  async complete(transactionId) {
    this.status = 'completed';
    this.transaction_id = transactionId;
    this.completed_at = new Date();
    await this.save();
  }

  /**
   * شکست پرداخت
   * @param {string} reason - دلیل شکست
   */
  async fail(reason) {
    this.status = 'failed';
    this.failure_reason = reason;
    this.failed_at = new Date();
    await this.save();
  }

  /**
   * بازپرداخت
   * @param {string} refundedBy - شناسه کاربر بازپرداخت کننده
   * @param {number} amount - مبلغ بازپرداخت
   * @param {string} reason - دلیل بازپرداخت
   */
  async refund(refundedBy, amount, reason) {
    this.status = 'refunded';
    this.refunded_by = refundedBy;
    this.refund_amount = amount;
    this.refund_reason = reason;
    this.refunded_at = new Date();
    await this.save();
  }

  /**
   * جستجوی پرداخت‌ها
   * @param {Object} filters - فیلترهای جستجو
   * @returns {Promise<Array>} - لیست پرداخت‌ها
   */
  static async search(filters = {}) {
    const where = {};
    
    if (filters.user_id) where.user_id = filters.user_id;
    if (filters.order_id) where.order_id = filters.order_id;
    if (filters.status) where.status = filters.status;
    if (filters.payment_method) where.payment_method = filters.payment_method;
    
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
          model: sequelize.models.Order,
          as: 'order',
          attributes: ['id', 'order_number', 'total_amount']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: filters.limit || 50,
      offset: filters.offset || 0
    });
  }
}
// تعریف مدل
Payment.init({
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
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  payment_method: {
    type: DataTypes.ENUM('credit_card', 'debit_card', 'bank_transfer', 'wallet', 'cash'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
    allowNull: false,
    defaultValue: 'pending'
  },
  transaction_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  gateway_response: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  failed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  failure_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  refunded_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  refunded_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  refund_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  refund_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Payment',
  tableName: 'payments',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['order_id'] },
    { fields: ['user_id'] },
    { fields: ['status'] },
    { fields: ['payment_method'] },
    { fields: ['transaction_id'] },
    { fields: ['created_at'] },
    { fields: ['refunded_by'] }
  ]
});

export default Payment;