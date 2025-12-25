/**
 * Migration: ایجاد جدول کارمندان
 */

export const up = async (queryInterface, Sequelize) => {
  // ایجاد enum برای وضعیت کارمندان
  await queryInterface.sequelize.query(`
    CREATE TYPE "employee_status_enum" AS ENUM ('active', 'inactive', 'terminated');
  `);

  // ایجاد جدول کارمندان
  await queryInterface.createTable('employees', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    company_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    employee_code: {
      type: Sequelize.STRING(50),
      allowNull: true
    },
    department: {
      type: Sequelize.STRING(100),
      allowNull: true
    },
    position: {
      type: Sequelize.STRING(100),
      allowNull: true
    },
    hire_date: {
      type: Sequelize.DATE,
      allowNull: true
    },
    status: {
      type: Sequelize.ENUM('active', 'inactive', 'terminated'),
      allowNull: false,
      defaultValue: 'active'
    },
    daily_meal_allowance: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00
    },
    monthly_meal_budget: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00
    },
    can_order: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    added_by: {
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
  await queryInterface.addIndex('employees', ['user_id', 'company_id'], {
    unique: true,
    name: 'employees_user_company_unique_idx'
  });

  await queryInterface.addIndex('employees', ['company_id'], {
    name: 'employees_company_id_idx'
  });

  await queryInterface.addIndex('employees', ['employee_code'], {
    name: 'employees_employee_code_idx'
  });

  await queryInterface.addIndex('employees', ['status'], {
    name: 'employees_status_idx'
  });

  await queryInterface.addIndex('employees', ['department'], {
    name: 'employees_department_idx'
  });

  await queryInterface.addIndex('employees', ['added_by'], {
    name: 'employees_added_by_idx'
  });

  await queryInterface.addIndex('employees', ['created_at'], {
    name: 'employees_created_at_idx'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // حذف جدول
  await queryInterface.dropTable('employees');

  // حذف enum
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "employee_status_enum";');
};