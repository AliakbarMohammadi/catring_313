import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export class Notification {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.userId = data.userId;
    this.type = data.type; // 'email', 'sms', 'push'
    this.channel = data.channel; // 'order_status', 'company_approval', 'menu_published', 'reminder'
    this.templateId = data.templateId;
    this.recipient = data.recipient; // email or phone number
    this.subject = data.subject;
    this.content = data.content;
    this.variables = data.variables || {};
    this.status = data.status || 'pending'; // 'pending', 'sent', 'failed', 'delivered'
    this.attempts = data.attempts || 0;
    this.maxAttempts = data.maxAttempts || 3;
    this.scheduledAt = data.scheduledAt || new Date();
    this.sentAt = data.sentAt;
    this.deliveredAt = data.deliveredAt;
    this.errorMessage = data.errorMessage;
    this.externalId = data.externalId; // ID from external service (email/SMS provider)
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static async create(notificationData) {
    const notification = new Notification(notificationData);
    
    const result = await query(
      `INSERT INTO notifications (
        id, user_id, type, channel, template_id, recipient, subject, content, 
        variables, status, attempts, max_attempts, scheduled_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        notification.id, notification.userId, notification.type, notification.channel,
        notification.templateId, notification.recipient, notification.subject, notification.content,
        JSON.stringify(notification.variables), notification.status, notification.attempts,
        notification.maxAttempts, notification.scheduledAt, notification.createdAt, notification.updatedAt
      ]
    );

    return new Notification(result.rows[0]);
  }

  static async findById(id) {
    const result = await query('SELECT * FROM notifications WHERE id = $1', [id]);
    return result.rows.length > 0 ? new Notification(result.rows[0]) : null;
  }

  static async findByUserId(userId, limit = 50, offset = 0) {
    const result = await query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    return result.rows.map(row => new Notification(row));
  }

  static async findPending(limit = 100) {
    const result = await query(
      `SELECT * FROM notifications 
       WHERE status = 'pending' AND scheduled_at <= NOW() AND attempts < max_attempts
       ORDER BY scheduled_at ASC LIMIT $1`,
      [limit]
    );
    return result.rows.map(row => new Notification(row));
  }

  async updateStatus(status, errorMessage = null, externalId = null) {
    this.status = status;
    this.errorMessage = errorMessage;
    this.externalId = externalId;
    this.updatedAt = new Date();

    if (status === 'sent') {
      this.sentAt = new Date();
    } else if (status === 'delivered') {
      this.deliveredAt = new Date();
    }

    await query(
      `UPDATE notifications 
       SET status = $1, error_message = $2, external_id = $3, sent_at = $4, 
           delivered_at = $5, updated_at = $6
       WHERE id = $7`,
      [this.status, this.errorMessage, this.externalId, this.sentAt, 
       this.deliveredAt, this.updatedAt, this.id]
    );
  }

  async incrementAttempts() {
    this.attempts += 1;
    this.updatedAt = new Date();

    await query(
      'UPDATE notifications SET attempts = $1, updated_at = $2 WHERE id = $3',
      [this.attempts, this.updatedAt, this.id]
    );
  }

  canRetry() {
    return this.attempts < this.maxAttempts && this.status === 'failed';
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      type: this.type,
      channel: this.channel,
      templateId: this.templateId,
      recipient: this.recipient,
      subject: this.subject,
      content: this.content,
      variables: this.variables,
      status: this.status,
      attempts: this.attempts,
      maxAttempts: this.maxAttempts,
      scheduledAt: this.scheduledAt,
      sentAt: this.sentAt,
      deliveredAt: this.deliveredAt,
      errorMessage: this.errorMessage,
      externalId: this.externalId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}