/**
 * Migration: ایجاد جدول اعلان‌ها
 */

export const up = async (queryInterface, Sequelize) => {
  // ایجاد enum برای نوع اعلان
  await queryInterface.sequelize.query(`
    CREATE TYPE "notification_type_enum" AS ENUM ('email', 'sms', 'push', 'in_app');
  `);

  // ایجاد enum برای وضعیت اعلان
  await queryInterface.sequelize.query(`
    CREATE TYPE "notification_status_enum" AS ENUM ('pending', 'sent', 'delivered', 'failed', 'cancelled');
  `);

  // ایجاد enum برای اولویت اعلان
  await queryInterface.sequelize.query(`
    CREATE TYPE "notification_priority_enum" AS ENUM ('low', 'normal', 'high', 'urgent');
  `);

  // ایجاد جدول اعلان‌ها
  await queryInterface.createTable('notifications', {
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
    type: {
      type: Sequelize.ENUM('email', 'sms', 'push', 'in_app'),
      allowNull: false
    },
    status: {
      type: Sequelize.ENUM('pending', 'sent', 'delivered', 'failed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    priority: {
      type: Sequelize.ENUM('low', 'normal', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'normal'
    },
    title: {
      type: Sequelize.STRING(255),
      allowNull: false
    },
    message: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    template_name: {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'نام template استفاده شده'
    },
    template_data: {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'داده‌های template'
    },
    recipient_email: {
      type: Sequelize.STRING(255),
      allowNull: true
    },
    recipient_phone: {
      type: Sequelize.STRING(20),
      allowNull: true
    },
    sender_name: {
      type: Sequelize.STRING(100),
      allowNull: true
    },
    sender_email: {
      type: Sequelize.STRING(255),
      allowNull: true
    },
    subject: {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'موضوع (برای ایمیل)'
    },
    html_content: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'محتوای HTML (برای ایمیل)'
    },
    attachments: {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'فایل‌های ضمیمه'
    },
    metadata: {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'اطلاعات اضافی'
    },
    related_entity_type: {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'نوع موجودیت مرتبط (order, payment, etc.)'
    },
    related_entity_id: {
      type: Sequelize.UUID,
      allowNull: true,
      comment: 'شناسه موجودیت مرتبط'
    },
    scheduled_at: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'زمان زمان‌بندی شده برای ارسال'
    },
    sent_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    delivered_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    failed_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    failure_reason: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    retry_count: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    max_retries: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 3
    },
    next_retry_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    external_id: {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'شناسه خارجی (از سرویس ارسال)'
    },
    external_response: {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'پاسخ سرویس خارجی'
    },
    read_at: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'زمان خواندن (برای اعلان‌های داخل اپ)'
    },
    expires_at: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'زمان انقضا'
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
  await queryInterface.addIndex('notifications', ['user_id'], {
    name: 'notifications_user_id_idx'
  });

  await queryInterface.addIndex('notifications', ['type'], {
    name: 'notifications_type_idx'
  });

  await queryInterface.addIndex('notifications', ['status'], {
    name: 'notifications_status_idx'
  });

  await queryInterface.addIndex('notifications', ['priority'], {
    name: 'notifications_priority_idx'
  });

  await queryInterface.addIndex('notifications', ['template_name'], {
    name: 'notifications_template_name_idx'
  });

  await queryInterface.addIndex('notifications', ['related_entity_type', 'related_entity_id'], {
    name: 'notifications_related_entity_idx'
  });

  await queryInterface.addIndex('notifications', ['scheduled_at'], {
    name: 'notifications_scheduled_at_idx'
  });

  await queryInterface.addIndex('notifications', ['sent_at'], {
    name: 'notifications_sent_at_idx'
  });

  await queryInterface.addIndex('notifications', ['next_retry_at'], {
    name: 'notifications_next_retry_at_idx'
  });

  await queryInterface.addIndex('notifications', ['external_id'], {
    name: 'notifications_external_id_idx'
  });

  await queryInterface.addIndex('notifications', ['expires_at'], {
    name: 'notifications_expires_at_idx'
  });

  await queryInterface.addIndex('notifications', ['created_at'], {
    name: 'notifications_created_at_idx'
  });

  await queryInterface.addIndex('notifications', ['template_data'], {
    using: 'gin',
    name: 'notifications_template_data_gin_idx'
  });

  await queryInterface.addIndex('notifications', ['metadata'], {
    using: 'gin',
    name: 'notifications_metadata_gin_idx'
  });

  await queryInterface.addIndex('notifications', ['attachments'], {
    using: 'gin',
    name: 'notifications_attachments_gin_idx'
  });

  await queryInterface.addIndex('notifications', ['external_response'], {
    using: 'gin',
    name: 'notifications_external_response_gin_idx'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // حذف جدول
  await queryInterface.dropTable('notifications');

  // حذف enum ها
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "notification_type_enum";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "notification_status_enum";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "notification_priority_enum";');
};