import { Notification } from '../models/Notification.js';
import { NotificationTemplate } from '../models/NotificationTemplate.js';
import { UserPreference } from '../models/UserPreference.js';
import { EmailService } from './EmailService.js';
import { SMSService } from './SMSService.js';
import { createLogger } from '@tadbir-khowan/shared';

const logger = createLogger('notification-service');

export class NotificationService {
  constructor() {
    this.emailService = new EmailService();
    this.smsService = new SMSService();
  }

  async sendNotification(notificationData) {
    try {
      // Get user preferences
      const userPreferences = await UserPreference.findByUserIdAndChannel(
        notificationData.userId,
        notificationData.channel
      );

      // If no preferences found, create default ones
      if (!userPreferences) {
        await UserPreference.createDefaultPreferences(notificationData.userId);
        const newPreferences = await UserPreference.findByUserIdAndChannel(
          notificationData.userId,
          notificationData.channel
        );
        if (newPreferences) {
          userPreferences = newPreferences;
        }
      }

      const notifications = [];

      // Send email if enabled
      if (userPreferences && userPreferences.isEnabled('email') && notificationData.email) {
        const emailNotification = await this.createAndSendEmail({
          ...notificationData,
          type: 'email',
          recipient: notificationData.email,
          language: userPreferences.language
        });
        notifications.push(emailNotification);
      }

      // Send SMS if enabled
      if (userPreferences && userPreferences.isEnabled('sms') && notificationData.phone) {
        const smsNotification = await this.createAndSendSMS({
          ...notificationData,
          type: 'sms',
          recipient: notificationData.phone,
          language: userPreferences.language
        });
        notifications.push(smsNotification);
      }

      return notifications;
    } catch (error) {
      logger.error('Failed to send notification', { 
        userId: notificationData.userId,
        channel: notificationData.channel,
        error: error.message 
      });
      throw error;
    }
  }

  async createAndSendEmail(notificationData) {
    try {
      // Get template
      const template = await NotificationTemplate.findByChannelAndType(
        notificationData.channel,
        'email',
        notificationData.language || 'fa'
      );

      let subject = notificationData.subject;
      let content = notificationData.content;

      // Render template if available
      if (template) {
        const rendered = template.renderContent(notificationData.variables || {});
        subject = rendered.subject || subject;
        content = rendered.content || content;
      }

      // Create notification record
      const notification = await Notification.create({
        userId: notificationData.userId,
        type: 'email',
        channel: notificationData.channel,
        templateId: template?.id,
        recipient: notificationData.recipient,
        subject,
        content,
        variables: notificationData.variables || {},
        scheduledAt: notificationData.scheduledAt || new Date()
      });

      // Send email
      const result = await this.emailService.sendEmail(
        notificationData.recipient,
        subject,
        content
      );

      // Update notification status
      if (result.success) {
        await notification.updateStatus('sent', null, result.messageId);
      } else {
        await notification.updateStatus('failed', result.error);
      }

      return notification;
    } catch (error) {
      logger.error('Failed to create and send email', { error: error.message });
      throw error;
    }
  }

  async createAndSendSMS(notificationData) {
    try {
      // Get template
      const template = await NotificationTemplate.findByChannelAndType(
        notificationData.channel,
        'sms',
        notificationData.language || 'fa'
      );

      let content = notificationData.content;

      // Render template if available
      if (template) {
        const rendered = template.renderContent(notificationData.variables || {});
        content = rendered.content || content;
      }

      // Create notification record
      const notification = await Notification.create({
        userId: notificationData.userId,
        type: 'sms',
        channel: notificationData.channel,
        templateId: template?.id,
        recipient: notificationData.recipient,
        content,
        variables: notificationData.variables || {},
        scheduledAt: notificationData.scheduledAt || new Date()
      });

      // Send SMS
      const result = await this.smsService.sendSMS(
        notificationData.recipient,
        content
      );

      // Update notification status
      if (result.success) {
        await notification.updateStatus('sent', null, result.messageId);
      } else {
        await notification.updateStatus('failed', result.error);
      }

      return notification;
    } catch (error) {
      logger.error('Failed to create and send SMS', { error: error.message });
      throw error;
    }
  }

  async processPendingNotifications() {
    try {
      const pendingNotifications = await Notification.findPending(50);
      
      logger.info(`Processing ${pendingNotifications.length} pending notifications`);

      for (const notification of pendingNotifications) {
        try {
          await notification.incrementAttempts();

          let result;
          if (notification.type === 'email') {
            result = await this.emailService.sendEmail(
              notification.recipient,
              notification.subject,
              notification.content
            );
          } else if (notification.type === 'sms') {
            result = await this.smsService.sendSMS(
              notification.recipient,
              notification.content
            );
          }

          if (result && result.success) {
            await notification.updateStatus('sent', null, result.messageId);
          } else {
            const errorMessage = result ? result.error : 'Unknown error';
            if (notification.canRetry()) {
              await notification.updateStatus('failed', errorMessage);
            } else {
              await notification.updateStatus('failed', `Max attempts reached: ${errorMessage}`);
            }
          }
        } catch (error) {
          logger.error('Failed to process notification', { 
            notificationId: notification.id,
            error: error.message 
          });
          
          if (notification.canRetry()) {
            await notification.updateStatus('failed', error.message);
          } else {
            await notification.updateStatus('failed', `Max attempts reached: ${error.message}`);
          }
        }
      }

      return pendingNotifications.length;
    } catch (error) {
      logger.error('Failed to process pending notifications', { error: error.message });
      throw error;
    }
  }

  async getNotificationHistory(userId, limit = 50, offset = 0) {
    return await Notification.findByUserId(userId, limit, offset);
  }

  async getUserPreferences(userId) {
    return await UserPreference.findByUserId(userId);
  }

  async updateUserPreferences(userId, preferences) {
    const results = [];

    for (const pref of preferences) {
      const existing = await UserPreference.findByUserIdAndChannel(userId, pref.channel);
      
      if (existing) {
        await existing.update(pref);
        results.push(existing);
      } else {
        const newPref = await UserPreference.create({
          userId,
          ...pref
        });
        results.push(newPref);
      }
    }

    return results;
  }
}