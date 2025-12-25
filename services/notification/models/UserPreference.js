import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export class UserPreference {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.userId = data.userId;
    this.channel = data.channel; // 'order_status', 'company_approval', 'menu_published', 'reminder'
    this.emailEnabled = data.emailEnabled !== undefined ? data.emailEnabled : true;
    this.smsEnabled = data.smsEnabled !== undefined ? data.smsEnabled : true;
    this.pushEnabled = data.pushEnabled !== undefined ? data.pushEnabled : true;
    this.language = data.language || 'fa';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static async create(preferenceData) {
    const preference = new UserPreference(preferenceData);
    
    const result = await query(
      `INSERT INTO user_notification_preferences (
        id, user_id, channel, email_enabled, sms_enabled, push_enabled, language, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        preference.id, preference.userId, preference.channel, preference.emailEnabled,
        preference.smsEnabled, preference.pushEnabled, preference.language,
        preference.createdAt, preference.updatedAt
      ]
    );

    return new UserPreference(result.rows[0]);
  }

  static async findByUserId(userId) {
    const result = await query(
      'SELECT * FROM user_notification_preferences WHERE user_id = $1',
      [userId]
    );
    return result.rows.map(row => new UserPreference(row));
  }

  static async findByUserIdAndChannel(userId, channel) {
    const result = await query(
      'SELECT * FROM user_notification_preferences WHERE user_id = $1 AND channel = $2',
      [userId, channel]
    );
    return result.rows.length > 0 ? new UserPreference(result.rows[0]) : null;
  }

  static async createDefaultPreferences(userId) {
    const defaultChannels = ['order_status', 'company_approval', 'menu_published', 'reminder'];
    const preferences = [];

    for (const channel of defaultChannels) {
      const preference = await UserPreference.create({
        userId,
        channel,
        emailEnabled: true,
        smsEnabled: true,
        pushEnabled: true,
        language: 'fa'
      });
      preferences.push(preference);
    }

    return preferences;
  }

  async update(updateData) {
    Object.assign(this, updateData);
    this.updatedAt = new Date();

    await query(
      `UPDATE user_notification_preferences 
       SET email_enabled = $1, sms_enabled = $2, push_enabled = $3, language = $4, updated_at = $5
       WHERE id = $6`,
      [this.emailEnabled, this.smsEnabled, this.pushEnabled, this.language, this.updatedAt, this.id]
    );
  }

  isEnabled(type) {
    switch (type) {
      case 'email':
        return this.emailEnabled;
      case 'sms':
        return this.smsEnabled;
      case 'push':
        return this.pushEnabled;
      default:
        return false;
    }
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      channel: this.channel,
      emailEnabled: this.emailEnabled,
      smsEnabled: this.smsEnabled,
      pushEnabled: this.pushEnabled,
      language: this.language,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}