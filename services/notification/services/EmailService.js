import nodemailer from 'nodemailer';
import { createLogger } from '@tadbir-khowan/shared';

const logger = createLogger('email-service');

export class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  initialize() {
    try {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'localhost',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service', { error: error.message });
      throw error;
    }
  }

  async sendEmail(to, subject, content, options = {}) {
    try {
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      const mailOptions = {
        from: options.from || process.env.SMTP_FROM || 'noreply@tadbir-khowan.com',
        to,
        subject,
        html: content,
        text: this.stripHtml(content),
        ...options
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', { 
        to, 
        subject, 
        messageId: result.messageId 
      });

      return {
        success: true,
        messageId: result.messageId,
        response: result.response
      };
    } catch (error) {
      logger.error('Failed to send email', { 
        to, 
        subject, 
        error: error.message 
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  async verifyConnection() {
    try {
      if (!this.transporter) {
        return false;
      }

      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection verification failed', { error: error.message });
      return false;
    }
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  async sendBulkEmails(emails) {
    const results = [];
    
    for (const email of emails) {
      const result = await this.sendEmail(
        email.to,
        email.subject,
        email.content,
        email.options
      );
      
      results.push({
        ...email,
        result
      });

      // Add small delay to avoid overwhelming the SMTP server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }
}