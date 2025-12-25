/**
 * Migration: ایجاد جدول فاکتورها
 */

export const up = async (queryInterface, Sequelize) => {
  // ایجاد enum برای نوع فاکتور
  await queryInterface.sequelize.query(`
    CREATE TYPE "invoice_type_enum" AS ENUM ('individual', 'company_monthly', 'company_order');
  `);

  // ایجاد enum برای وضعیت فاکتور
  await queryInterface.sequelize.query(`
    CREATE TYPE "invoice_status_enum" AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
  `);

  // ایجاد جدول فاکتورها
  await queryInterface.createTable('invoices', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    invoice_number: {
      type: Sequelize.STRING(50),
      allowNull: false,
      unique: true
    },
    invoice_type: {
      type: Sequelize.ENUM('individual', 'company_monthly', 'company_order'),
      allowNull: false
    },
    status: {
      type: Sequelize.ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled'),
      allowNull: false,
      defaultValue: 'draft'
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    company_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'companies',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    order_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'orders',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    billing_period_start: {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: 'شروع دوره صورتحساب (برای فاکتورهای ماهانه)'
    },
    billing_period_end: {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: 'پایان دوره صورتحساب (برای فاکتورهای ماهانه)'
    },
    issue_date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
      defaultValue: Sequelize.NOW
    },
    due_date: {
      type: Sequelize.DATEONLY,
      allowNull: true
    },
    subtotal: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    discount_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    tax_rate: {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 9.00,
      comment: 'نرخ مالیات (درصد)'
    },
    tax_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    total_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    paid_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    remaining_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    currency: {
      type: Sequelize.STRING(3),
      allowNull: false,
      defaultValue: 'IRR'
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    terms_and_conditions: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    billing_address: {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'آدرس صورتحساب'
    },
    company_info: {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'اطلاعات شرکت صادرکننده'
    },
    pdf_path: {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'مسیر فایل PDF فاکتور'
    },
    pdf_generated_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    sent_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    paid_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    cancelled_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    cancelled_reason: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    created_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
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
  await queryInterface.addIndex('invoices', ['invoice_number'], {
    unique: true,
    name: 'invoices_invoice_number_unique_idx'
  });

  await queryInterface.addIndex('invoices', ['invoice_type'], {
    name: 'invoices_invoice_type_idx'
  });

  await queryInterface.addIndex('invoices', ['status'], {
    name: 'invoices_status_idx'
  });

  await queryInterface.addIndex('invoices', ['user_id'], {
    name: 'invoices_user_id_idx'
  });

  await queryInterface.addIndex('invoices', ['company_id'], {
    name: 'invoices_company_id_idx'
  });

  await queryInterface.addIndex('invoices', ['order_id'], {
    name: 'invoices_order_id_idx'
  });

  await queryInterface.addIndex('invoices', ['issue_date'], {
    name: 'invoices_issue_date_idx'
  });

  await queryInterface.addIndex('invoices', ['due_date'], {
    name: 'invoices_due_date_idx'
  });

  await queryInterface.addIndex('invoices', ['billing_period_start', 'billing_period_end'], {
    name: 'invoices_billing_period_idx'
  });

  await queryInterface.addIndex('invoices', ['total_amount'], {
    name: 'invoices_total_amount_idx'
  });

  await queryInterface.addIndex('invoices', ['created_by'], {
    name: 'invoices_created_by_idx'
  });

  await queryInterface.addIndex('invoices', ['created_at'], {
    name: 'invoices_created_at_idx'
  });

  await queryInterface.addIndex('invoices', ['billing_address'], {
    using: 'gin',
    name: 'invoices_billing_address_gin_idx'
  });

  await queryInterface.addIndex('invoices', ['company_info'], {
    using: 'gin',
    name: 'invoices_company_info_gin_idx'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // حذف جدول
  await queryInterface.dropTable('invoices');

  // حذف enum ها
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "invoice_type_enum";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "invoice_status_enum";');
};