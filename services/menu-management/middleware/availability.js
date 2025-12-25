import { MenuPublishingService } from '../services/MenuPublishingService.js';
import { createLogger } from '@tadbir-khowan/shared';

const logger = createLogger('availability-middleware');

/**
 * Middleware to check if menu items are available for ordering
 */
export const checkMenuAvailability = async (req, res, next) => {
  try {
    const { date, items } = req.body;
    
    if (!date || !items || !Array.isArray(items)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Date and items array are required'
        }
      });
    }

    // Check availability for each item
    const availabilityChecks = [];
    for (const item of items) {
      if (!item.foodItemId || !item.quantity) {
        return res.status(400).json({
          error: {
            code: 'INVALID_ITEM',
            message: 'Each item must have foodItemId and quantity'
          }
        });
      }

      const availability = await MenuPublishingService.checkItemAvailabilityForOrder(
        date,
        item.foodItemId,
        item.quantity
      );

      availabilityChecks.push({
        foodItemId: item.foodItemId,
        quantity: item.quantity,
        ...availability
      });
    }

    // Check if all items are available
    const unavailableItems = availabilityChecks.filter(check => !check.available);
    
    if (unavailableItems.length > 0) {
      return res.status(409).json({
        error: {
          code: 'ITEMS_UNAVAILABLE',
          message: 'Some items are not available',
          unavailableItems
        }
      });
    }

    // Add availability info to request for use in next middleware
    req.availabilityChecks = availabilityChecks;
    next();
    
  } catch (error) {
    logger.error('Error in availability middleware:', error);
    next(error);
  }
};

/**
 * Middleware to validate menu publishing permissions
 */
export const validatePublishingPermissions = (req, res, next) => {
  try {
    // In a real application, this would check user roles/permissions
    // For now, we'll assume the user has permission if they're authenticated
    
    const userRole = req.user?.role || req.headers['x-user-role'];
    
    if (!userRole) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required for menu publishing'
        }
      });
    }

    // Only catering managers can publish/unpublish menus
    if (userRole !== 'catering_manager' && userRole !== 'admin') {
      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only catering managers can publish/unpublish menus'
        }
      });
    }

    next();
  } catch (error) {
    logger.error('Error in publishing permissions middleware:', error);
    next(error);
  }
};

/**
 * Middleware to validate date parameters
 */
export const validateDateParameter = (req, res, next) => {
  try {
    const date = req.params.date || req.body.date;
    
    if (!date) {
      return res.status(400).json({
        error: {
          code: 'MISSING_DATE',
          message: 'Date parameter is required'
        }
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_DATE_FORMAT',
          message: 'Date must be in YYYY-MM-DD format'
        }
      });
    }

    // Validate that it's a valid date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().split('T')[0] !== date) {
      return res.status(400).json({
        error: {
          code: 'INVALID_DATE',
          message: 'Invalid date provided'
        }
      });
    }

    next();
  } catch (error) {
    logger.error('Error in date validation middleware:', error);
    next(error);
  }
};

/**
 * Middleware to check if date is not too far in the future
 */
export const validateFutureDate = (req, res, next) => {
  try {
    const date = req.params.date || req.body.date;
    const maxDaysInFuture = parseInt(process.env.MAX_MENU_DAYS_FUTURE) || 90;
    
    const today = new Date();
    const targetDate = new Date(date);
    const daysDifference = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysDifference > maxDaysInFuture) {
      return res.status(400).json({
        error: {
          code: 'DATE_TOO_FAR_FUTURE',
          message: `Cannot create menu more than ${maxDaysInFuture} days in the future`
        }
      });
    }

    next();
  } catch (error) {
    logger.error('Error in future date validation middleware:', error);
    next(error);
  }
};