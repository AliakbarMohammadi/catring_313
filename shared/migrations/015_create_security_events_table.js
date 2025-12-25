/**
 * Migration: ایجاد جدول رویدادهای امنیتی
 */

export const up = async (queryInterface, Sequelize) => {
  // ایجاد enum برای نوع رویداد امنیتی
  await queryInterface.sequelize.query(`
    CREATE TYPE "security_event_type_enum" AS ENUM (
      'FAILED_LOGIN', 'ACCOUNT_LOCKED', 'SUSPICIOUS_ACTIVITY', 'BRUTE_FORCE_ATTACK',
      'SQL_INJECTION_ATTEMPT', 'XSS_ATTEMPT', 'UNAUTHORIZED_ACCESS', 'DATA_BREACH',
      'PRIVILEGE_ESCALATION', 'MALICIOUS_FILE_UPLOAD', 'RATE_LIMIT_EXCEEDED',
      'INVALID_TOKEN', 'SESSION_HIJACK', 'PASSWORD_RESET_ABUSE'
    );
  `);

  // ایجاد enum برای سطح خطر
  await queryInterface.sequelize.query(`
    CREATE TYPE "risk_level_enum" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
  `);

  // ایجاد enum برای وضعیت رویداد
  await queryInterface.sequelize.query(`
    CREATE TYPE "security_event_status_enum" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE');
  `);

  // ایجاد جدول رویدادهای امنیتی
  await queryInterface.createTable('security_events', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    event_type: {
      type: Sequelize.ENUM(
        'FAILED_LOGIN', 'ACCOUNT_LOCKED', 'SUSPICIOUS_ACTIVITY', 'BRUTE_FORCE_ATTACK',
        'SQL_INJECTION_ATTEMPT', 'XSS_ATTEMPT', 'UNAUTHORIZED_ACCESS', 'DATA_BREACH',
        'PRIVILEGE_ESCALATION', 'MALICIOUS_FILE_UPLOAD', 'RATE_LIMIT_EXCEEDED',
        'INVALID_TOKEN', 'SESSION_HIJACK', 'PASSWORD_RESET_ABUSE'
      ),
      allowNull: false
    },
    risk_level: {
      type: Sequelize.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
      allowNull: false,
      defaultValue: 'MEDIUM'
    },
    status: {
      type: Sequelize.ENUM('OPEN', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'),
      allowNull: false,
      defaultValue: 'OPEN'
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
      allowNull: true
    },
    endpoint: {
      type: Sequelize.STRING(255),
      allowNull: true
    },
    method: {
      type: Sequelize.STRING(10),
      allowNull: true
    },
    payload: {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'داده‌های درخواست (sanitized)'
    },
    headers: {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'header های درخواست (sanitized)'
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    details: {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'جزئیات تکمیلی رویداد'
    },
    attack_pattern: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'الگوی حمله شناسایی شده'
    },
    geolocation: {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'موقعیت جغرافیایی IP'
    },
    blocked: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'آیا درخواست مسدود شده؟'
    },
    auto_resolved: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'آیا خودکار حل شده؟'
    },
    false_positive_reason: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    investigated_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    investigated_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    resolved_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    resolved_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    resolution_notes: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    related_events: {
      type: Sequelize.ARRAY(Sequelize.UUID),
      allowNull: true,
      defaultValue: [],
      comment: 'رویدادهای مرتبط'
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
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    }
  });

  // ایجاد index ها
  await queryInterface.addIndex('security_events', ['event_type'], {
    name: 'security_events_event_type_idx'
  });

  await queryInterface.addIndex('security_events', ['risk_level'], {
    name: 'security_events_risk_level_idx'
  });

  await queryInterface.addIndex('security_events', ['status'], {
    name: 'security_events_status_idx'
  });

  await queryInterface.addIndex('security_events', ['user_id'], {
    name: 'security_events_user_id_idx'
  });

  await queryInterface.addIndex('security_events', ['ip_address'], {
    name: 'security_events_ip_address_idx'
  });

  await queryInterface.addIndex('security_events', ['session_id'], {
    name: 'security_events_session_id_idx'
  });

  await queryInterface.addIndex('security_events', ['request_id'], {
    name: 'security_events_request_id_idx'
  });

  await queryInterface.addIndex('security_events', ['endpoint'], {
    name: 'security_events_endpoint_idx'
  });

  await queryInterface.addIndex('security_events', ['blocked'], {
    name: 'security_events_blocked_idx'
  });

  await queryInterface.addIndex('security_events', ['auto_resolved'], {
    name: 'security_events_auto_resolved_idx'
  });

  await queryInterface.addIndex('security_events', ['investigated_by'], {
    name: 'security_events_investigated_by_idx'
  });

  await queryInterface.addIndex('security_events', ['resolved_by'], {
    name: 'security_events_resolved_by_idx'
  });

  await queryInterface.addIndex('security_events', ['created_at'], {
    name: 'security_events_created_at_idx'
  });

  await queryInterface.addIndex('security_events', ['payload'], {
    using: 'gin',
    name: 'security_events_payload_gin_idx'
  });

  await queryInterface.addIndex('security_events', ['headers'], {
    using: 'gin',
    name: 'security_events_headers_gin_idx'
  });

  await queryInterface.addIndex('security_events', ['details'], {
    using: 'gin',
    name: 'security_events_details_gin_idx'
  });

  await queryInterface.addIndex('security_events', ['geolocation'], {
    using: 'gin',
    name: 'security_events_geolocation_gin_idx'
  });

  await queryInterface.addIndex('security_events', ['related_events'], {
    using: 'gin',
    name: 'security_events_related_events_gin_idx'
  });

  await queryInterface.addIndex('security_events', ['tags'], {
    using: 'gin',
    name: 'security_events_tags_gin_idx'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // حذف جدول
  await queryInterface.dropTable('security_events');

  // حذف enum ها
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "security_event_type_enum";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "risk_level_enum";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "security_event_status_enum";');
};