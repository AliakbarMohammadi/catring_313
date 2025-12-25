import express from 'express';
import { NotificationService } from '../services/NotificationService.js';
import { UserPreference } from '../models/UserPreference.js';
import { ValidationError, NotFoundError, createLogger } from '@tadbir-khowan/shared';

const router = express.Router();
const logger = createLogger('notification-routes');
const notificationService = new NotificationService();

// Send notification
router.post('/send', async (req, res, next) => {
  try {
    const {
      userId,
      channel,
      email,
      phone,
      subject,
      content,
      variables,
      scheduledAt
    } = req.body;

    // Validation
    if (!userId || !channel || !content) {
      throw new ValidationError('userId, channel, and content are required');
    }

    if (!email && !phone) {
      throw new ValidationError('At least one of email or phone must be provided');
    }

    const validChannels = ['order_status', 'company_approval', 'menu_published', 'reminder'];
    if (!validChannels.includes(channel)) {
      throw new ValidationError(`Invalid channel. Must be one of: ${validChannels.join(', ')}`);
    }

    const notifications = await notificationService.sendNotification({
      userId,
      channel,
      email,
      phone,
      subject,
      content,
      variables,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined
    });

    res.status(201).json({
      success: true,
      notifications: notifications.map(n => n.toJSON())
    });
  } catch (error) {
    next(error);
  }
});

// Get notification history for a user
router.get('/history/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!userId) {
      throw new ValidationError('userId is required');
    }

    const notifications = await notificationService.getNotificationHistory(
      userId,
      parseInt(limit),
      parseInt(offset)
    );

    res.json({
      success: true,
      notifications: notifications.map(n => n.toJSON()),
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: notifications.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get user notification preferences
router.get('/preferences/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      throw new ValidationError('userId is required');
    }

    const preferences = await notificationService.getUserPreferences(userId);

    res.json({
      success: true,
      preferences: preferences.map(p => p.toJSON())
    });
  } catch (error) {
    next(error);
  }
});

// Update user notification preferences
router.put('/preferences/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { preferences } = req.body;

    if (!userId) {
      throw new ValidationError('userId is required');
    }

    if (!Array.isArray(preferences)) {
      throw new ValidationError('preferences must be an array');
    }

    // Validate each preference
    const validChannels = ['order_status', 'company_approval', 'menu_published', 'reminder'];
    for (const pref of preferences) {
      if (!pref.channel || !validChannels.includes(pref.channel)) {
        throw new ValidationError(`Invalid channel in preferences. Must be one of: ${validChannels.join(', ')}`);
      }
    }

    const updatedPreferences = await notificationService.updateUserPreferences(userId, preferences);

    res.json({
      success: true,
      preferences: updatedPreferences.map(p => p.toJSON())
    });
  } catch (error) {
    next(error);
  }
});

// Create default preferences for a user
router.post('/preferences/:userId/default', async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      throw new ValidationError('userId is required');
    }

    const preferences = await UserPreference.createDefaultPreferences(userId);

    res.status(201).json({
      success: true,
      preferences: preferences.map(p => p.toJSON())
    });
  } catch (error) {
    next(error);
  }
});

// Process pending notifications (internal endpoint)
router.post('/process-pending', async (req, res, next) => {
  try {
    const processedCount = await notificationService.processPendingNotifications();

    res.json({
      success: true,
      processedCount
    });
  } catch (error) {
    next(error);
  }
});

export default router;