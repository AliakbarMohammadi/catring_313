/**
 * Migration: ایجاد جدول لاگ‌های audit
 */

export const up = async (queryInterface, Sequelize) => {
  // ایجاد enum برای نوع عملیات
  await queryInterface.sequelize.query(`
    CREATE TYPE "audit_action_enum" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT');
  `);

  // ایجاد جدول لاگ‌های audit
  await queryInterface.createTable('audit_logs', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false
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
    action: {
      type: Sequelize.ENUM('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT'),
      allowNull: false
    },
    resource_type: {
      type: Sequelize.STRING(100),
      allowNull: false,
      comment: 'نوع منبع (users, orders, payments, etc.)'
    },
    resource_id: {
      type: Sequelize.UUID,
      allowNull: true,
      comment: 'شناسه منبع'
    },
    old_values: {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'مقادیر قبلی (برای UPDATE)'
    },
    new_values: {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'مقادیر جدید (برای CREATE/UPDATE)'
    },
    ip_address: {
      type: Sequelize.INET,
      allowNull: true
    },
    user_agent: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    session_id: {
      type: Sequelize.STRING(255),
      allowNull: true
    },
    request_id: {
      type: Sequelize.UUID,
      allowNull: true,
      comment: 'شناسه درخواست'
    },
    endpoint: {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'endpoint API'
    },
    method: {
      type: Sequelize.STRING(10),
      allowNull: true,
      comment: 'HTTP method'
    },
    status_code: {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'HTTP status code'
    },
    duration_ms: {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'مدت زمان اجرا به میلی‌ثانیه'
    },
    error_message: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    metadata: {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'اطلاعات اضافی'
    },
    severity: {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'INFO',
      comment: 'سطح اهمیت (DEBUG, INFO, WARN, ERROR, CRITICAL)'
    },
    tags: {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true,
      defaultValue: []
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    }
  });

  // ایجاد index ها
  await queryInterface.addIndex('audit_logs', ['user_id'], {
    name: 'audit_logs_user_id_idx'
  });

  await queryInterface.addIndex('audit_logs', ['action'], {
    name: 'audit_logs_action_idx'
  });

  await queryInterface.addIndex('audit_logs', ['resource_type'], {
    name: 'audit_logs_resource_type_idx'
  });

  await queryInterface.addIndex('audit_logs', ['resource_type', 'resource_id'], {
    name: 'audit_logs_resource_idx'
  });

  await queryInterface.addIndex('audit_logs', ['ip_address'], {
    name: 'audit_logs_ip_address_idx'
  });

  await queryInterface.addIndex('audit_logs', ['session_id'], {
    name: 'audit_logs_session_id_idx'
  });

  await queryInterface.addIndex('audit_logs', ['request_id'], {
    name: 'audit_logs_request_id_idx'
  });

  await queryInterface.addIndex('audit_logs', ['endpoint'], {
    name: 'audit_logs_endpoint_idx'
  });

  await queryInterface.addIndex('audit_logs', ['severity'], {
    name: 'audit_logs_severity_idx'
  });

  await queryInterface.addIndex('audit_logs', ['created_at'], {
    name: 'audit_logs_created_at_idx'
  });

  await queryInterface.addIndex('audit_logs', ['old_values'], {
    using: 'gin',
    name: 'audit_logs_old_values_gin_idx'
  });

  await queryInterface.addIndex('audit_logs', ['new_values'], {
    using: 'gin',
    name: 'audit_logs_new_values_gin_idx'
  });

  await queryInterface.addIndex('audit_logs', ['metadata'], {
    using: 'gin',
    name: 'audit_logs_metadata_gin_idx'
  });

  await queryInterface.addIndex('audit_logs', ['tags'], {
    using: 'gin',
    name: 'audit_logs_tags_gin_idx'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // حذف جدول
  await queryInterface.dropTable('audit_logs');

  // حذف enum
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "audit_action_enum";');
};