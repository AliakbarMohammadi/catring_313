/**
 * Migration: ایجاد جدول کاربران
 */

export const up = async (queryInterface, Sequelize) => {
  // ایجاد enum برای نوع کاربران
  await queryInterface.sequelize.query(`
    CREATE TYPE "user_type_enum" AS ENUM ('individual_user', 'company_admin', 'catering_manager');
  `);

  // ایجاد enum برای وضعیت کاربران
  await queryInterface.sequelize.query(`
    CREATE TYPE "user_status_enum" AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
  `);

  // ایجاد جدول کاربران
  await queryInterface.createTable('users', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    email: {
      type: Sequelize.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      type: Sequelize.STRING(255),
      allowNull: false
    },
    first_name: {
      type: Sequelize.STRING(100),
      allowNull: false
    },
    last_name: {
      type: Sequelize.STRING(100),
      allowNull: false
    },
    phone: {
      type: Sequelize.STRING(20),
      allowNull: true
    },
    user_type: {
      type: Sequelize.ENUM('individual_user', 'company_admin', 'catering_manager'),
      allowNull: false,
      defaultValue: 'individual_user'
    },
    status: {
      type: Sequelize.ENUM('active', 'inactive', 'suspended', 'pending_verification'),
      allowNull: false,
      defaultValue: 'pending_verification'
    },
    email_verified: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    email_verification_token: {
      type: Sequelize.STRING(255),
      allowNull: true
    },
    password_reset_token: {
      type: Sequelize.STRING(255),
      allowNull: true
    },
    password_reset_expires: {
      type: Sequelize.DATE,
      allowNull: true
    },
    last_login: {
      type: Sequelize.DATE,
      allowNull: true
    },
    login_attempts: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    locked_until: {
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
  await queryInterface.addIndex('users', ['email'], {
    unique: true,
    name: 'users_email_unique_idx'
  });

  await queryInterface.addIndex('users', ['user_type'], {
    name: 'users_user_type_idx'
  });

  await queryInterface.addIndex('users', ['status'], {
    name: 'users_status_idx'
  });

  await queryInterface.addIndex('users', ['email_verification_token'], {
    name: 'users_email_verification_token_idx'
  });

  await queryInterface.addIndex('users', ['password_reset_token'], {
    name: 'users_password_reset_token_idx'
  });

  await queryInterface.addIndex('users', ['created_at'], {
    name: 'users_created_at_idx'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // حذف جدول
  await queryInterface.dropTable('users');

  // حذف enum ها
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "user_type_enum";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "user_status_enum";');
};