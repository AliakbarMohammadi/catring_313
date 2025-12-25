/**
 * Migration: ایجاد جدول شرکت‌ها
 */

export const up = async (queryInterface, Sequelize) => {
  // ایجاد enum برای وضعیت شرکت‌ها
  await queryInterface.sequelize.query(`
    CREATE TYPE "company_status_enum" AS ENUM ('pending', 'approved', 'rejected', 'suspended');
  `);

  // ایجاد جدول شرکت‌ها
  await queryInterface.createTable('companies', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: Sequelize.STRING(255),
      allowNull: false
    },
    registration_number: {
      type: Sequelize.STRING(50),
      allowNull: true,
      unique: true
    },
    tax_id: {
      type: Sequelize.STRING(50),
      allowNull: true
    },
    address: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    city: {
      type: Sequelize.STRING(100),
      allowNull: true
    },
    postal_code: {
      type: Sequelize.STRING(20),
      allowNull: true
    },
    phone: {
      type: Sequelize.STRING(20),
      allowNull: true
    },
    email: {
      type: Sequelize.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    website: {
      type: Sequelize.STRING(255),
      allowNull: true
    },
    company_code: {
      type: Sequelize.STRING(20),
      allowNull: false,
      unique: true
    },
    admin_user_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    status: {
      type: Sequelize.ENUM('pending', 'approved', 'rejected', 'suspended'),
      allowNull: false,
      defaultValue: 'pending'
    },
    approved_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    approved_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    rejection_reason: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    employee_count: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    max_employees: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    subscription_plan: {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'basic'
    },
    subscription_expires_at: {
      type: Sequelize.DATE,
      allowNull: true
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
  await queryInterface.addIndex('companies', ['company_code'], {
    unique: true,
    name: 'companies_company_code_unique_idx'
  });

  await queryInterface.addIndex('companies', ['registration_number'], {
    unique: true,
    name: 'companies_registration_number_unique_idx'
  });

  await queryInterface.addIndex('companies', ['admin_user_id'], {
    name: 'companies_admin_user_id_idx'
  });

  await queryInterface.addIndex('companies', ['status'], {
    name: 'companies_status_idx'
  });

  await queryInterface.addIndex('companies', ['approved_by'], {
    name: 'companies_approved_by_idx'
  });

  await queryInterface.addIndex('companies', ['created_at'], {
    name: 'companies_created_at_idx'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // حذف جدول
  await queryInterface.dropTable('companies');

  // حذف enum
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "company_status_enum";');
};