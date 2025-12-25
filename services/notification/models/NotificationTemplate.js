import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export class NotificationTemplate {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.name = data.name;
    this.type = data.type; // 'email', 'sms'
    this.channel = data.channel; // 'order_status', 'company_approval', 'menu_published', 'reminder'
    this.language = data.language || 'fa'; // 'fa' for Persian, 'en' for English
    this.subject = data.subject; // For email templates
    this.content = data.content;
    this.variables = data.variables || []; // Array of variable names used in template
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static async create(templateData) {
    const template = new NotificationTemplate(templateData);
    
    const result = await query(
      `INSERT INTO notification_templates (
        id, name, type, channel, language, subject, content, variables, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        template.id, template.name, template.type, template.channel, template.language,
        template.subject, template.content, JSON.stringify(template.variables),
        template.isActive, template.createdAt, template.updatedAt
      ]
    );

    return new NotificationTemplate(result.rows[0]);
  }

  static async findById(id) {
    const result = await query('SELECT * FROM notification_templates WHERE id = $1', [id]);
    return result.rows.length > 0 ? new NotificationTemplate(result.rows[0]) : null;
  }

  static async findByChannelAndType(channel, type, language = 'fa') {
    const result = await query(
      'SELECT * FROM notification_templates WHERE channel = $1 AND type = $2 AND language = $3 AND is_active = true',
      [channel, type, language]
    );
    return result.rows.length > 0 ? new NotificationTemplate(result.rows[0]) : null;
  }

  static async findAll(filters = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (filters.type) {
      paramCount++;
      whereClause += ` AND type = $${paramCount}`;
      params.push(filters.type);
    }

    if (filters.channel) {
      paramCount++;
      whereClause += ` AND channel = $${paramCount}`;
      params.push(filters.channel);
    }

    if (filters.language) {
      paramCount++;
      whereClause += ` AND language = $${paramCount}`;
      params.push(filters.language);
    }

    if (filters.isActive !== undefined) {
      paramCount++;
      whereClause += ` AND is_active = $${paramCount}`;
      params.push(filters.isActive);
    }

    const result = await query(
      `SELECT * FROM notification_templates ${whereClause} ORDER BY created_at DESC`,
      params
    );
    return result.rows.map(row => new NotificationTemplate(row));
  }

  async update(updateData) {
    Object.assign(this, updateData);
    this.updatedAt = new Date();

    await query(
      `UPDATE notification_templates 
       SET name = $1, type = $2, channel = $3, language = $4, subject = $5, 
           content = $6, variables = $7, is_active = $8, updated_at = $9
       WHERE id = $10`,
      [
        this.name, this.type, this.channel, this.language, this.subject,
        this.content, JSON.stringify(this.variables), this.isActive, 
        this.updatedAt, this.id
      ]
    );
  }

  async delete() {
    await query('DELETE FROM notification_templates WHERE id = $1', [this.id]);
  }

  renderContent(variables = {}) {
    let renderedContent = this.content;
    let renderedSubject = this.subject;

    // Replace variables in content
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      renderedContent = renderedContent.replace(new RegExp(placeholder, 'g'), value);
      if (renderedSubject) {
        renderedSubject = renderedSubject.replace(new RegExp(placeholder, 'g'), value);
      }
    }

    return {
      subject: renderedSubject,
      content: renderedContent
    };
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      channel: this.channel,
      language: this.language,
      subject: this.subject,
      content: this.content,
      variables: this.variables,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}