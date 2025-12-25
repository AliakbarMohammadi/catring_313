/**
 * Migration: ایجاد جدول پرداخت‌ها
 */

export const up = async (queryInterface, Sequelize) => {
  // ایجاد enum برای وضعیت پرداخت
  await queryInterface.sequelize.query(`
    CREATE TYPE "payment_status_enum" AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded');
  `);

  // ایجاد enum برای روش پرداخت
  await queryInterface.sequelize.query(`
    CREATE TYPE "payment_method_enum" AS ENUM ('credit_card', 'debit_card', 'bank_transfer', 'wallet', 'cash', 'company_credit');
  `);

  // ایجاد جدول پرداخت‌ها
  await queryInterface.createTable('payments', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    payment_number: {
      type: Sequelize.STRING(50),
      allowNull: false,
      unique: true
    },
    order_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    amount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: Sequelize.STRING(3),
      allowNull: false,
      defaultValue: 'IRR'
    },
    payment_method: {
      type: Sequelize.ENUM('credit_card', 'debit_card', 'bank_transfer', 'wallet', 'cash', 'company_credit'),
      allowNull: false
    },
    status: {
      type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'),
      allowNull: false,
      defaultValue: 'pending'
    },
    gateway_name: {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'نام درگاه پرداخت'
    },
    gateway_transaction_id: {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'شناسه تراکنش در درگاه'
    },
    gateway_reference_id: {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'شناسه مرجع درگاه'
    },
    gateway_response: {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'پاسخ کامل درگاه پرداخت'
    },
    card_number_masked: {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'شماره کارت ماسک شده'
    },
    card_holder_name: {
      type: Sequelize.STRING(100),
      allowNull: true
    },
    bank_name: {
      type: Sequelize.STRING(100),
      allowNull: true
    },
    tracking_code: {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'کد پیگیری'
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    failure_reason: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    refund_amount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00
    },
    refund_reason: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    refunded_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    refunded_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    processed_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    completed_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    failed_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    expires_at: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'زمان انقضای پرداخت'
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    }
  });

  // ایجاد index ها
  await queryInterface.addIndex('payments', ['payment_number'], {
    unique: true,
    name: 'payments_payment_number_unique_idx'
  });

  await queryInterface.addIndex('payments', ['order_id'], {
    name: 'payments_order_id_idx'
  });

  await queryInterface.addIndex('payments', ['user_id'], {
    name: 'payments_user_id_idx'
  });

  await queryInterface.addIndex('payments', ['status'], {
    name: 'payments_status_idx'
  });

  await queryInterface.addIndex('payments', ['payment_method'], {
    name: 'payments_payment_method_idx'
  });

  await queryInterface.addIndex('payments', ['gateway_name'], {
    name: 'payments_gateway_name_idx'
  });

  await queryInterface.addIndex('payments', ['gateway_transaction_id'], {
    name: 'payments_gateway_transaction_id_idx'
  });

  await queryInterface.addIndex('payments', ['tracking_code'], {
    name: 'payments_tracking_code_idx'
  });

  await queryInterface.addIndex('payments', ['refunded_by'], {
    name: 'payments_refunded_by_idx'
  });

  await queryInterface.addIndex('payments', ['created_at'], {
    name: 'payments_created_at_idx'
  });

  await queryInterface.addIndex('payments', ['completed_at'], {
    name: 'payments_completed_at_idx'
  });

  await queryInterface.addIndex('payments', ['gateway_response'], {
    using: 'gin',
    name: 'payments_gateway_response_gin_idx'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // حذف جدول
  await queryInterface.dropTable('payments');

  // حذف enum ها
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "payment_status_enum";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "payment_method_enum";');
};