import { DailyMenu } from '../models/DailyMenu.js';
import { FoodItem } from '../models/FoodItem.js';
import { createLogger, ValidationError, NotFoundError } from '@tadbir-khowan/shared';

const logger = createLogger('menu-publishing-service');

export class MenuPublishingService {
  static async validateMenuForPublishing(date) {
    try {
      const menu = await DailyMenu.findByDate(date);
      if (!menu) {
        throw new NotFoundError('Daily menu not found for this date');
      }

      // Check if menu has items
      if (!menu.items || menu.items.length === 0) {
        throw new ValidationError('Cannot publish menu without items');
      }

      // Validate each menu item
      const validationErrors = [];
      for (const item of menu.items) {
        // Check if food item exists and is active
        const foodItem = await FoodItem.findById(item.foodItemId);
        if (!foodItem) {
          validationErrors.push(`Food item with ID ${item.foodItemId} not found`);
          continue;
        }

        if (!foodItem.isActive) {
          validationErrors.push(`Food item "${foodItem.name}" is not active`);
        }

        // Check pricing
        if (item.price <= 0) {
          validationErrors.push(`Invalid price for food item "${foodItem.name}"`);
        }

        // Check availability
        if (item.availableQuantity < 0) {
          validationErrors.push(`Invalid available quantity for food item "${foodItem.name}"`);
        }
      }

      if (validationErrors.length > 0) {
        throw new ValidationError(`Menu validation failed: ${validationErrors.join(', ')}`);
      }

      return {
        valid: true,
        menu: menu,
        itemCount: menu.items.length
      };
    } catch (error) {
      logger.error('Error validating menu for publishing:', error);
      throw error;
    }
  }

  static async publishMenu(date, publishedBy = null) {
    try {
      // Validate menu first
      const validation = await this.validateMenuForPublishing(date);
      
      if (!validation.valid) {
        throw new ValidationError('Menu validation failed');
      }

      // Check if date is not in the past
      const today = new Date().toISOString().split('T')[0];
      if (date < today) {
        throw new ValidationError('Cannot publish menu for past dates');
      }

      // Publish the menu
      await DailyMenu.publish(date);
      
      logger.info(`Menu published for date: ${date}`, { 
        publishedBy, 
        itemCount: validation.itemCount 
      });

      // Return updated menu
      const publishedMenu = await DailyMenu.findByDate(date);
      return {
        success: true,
        menu: publishedMenu,
        publishedAt: new Date(),
        publishedBy
      };
    } catch (error) {
      logger.error('Error publishing menu:', error);
      throw error;
    }
  }

  static async unpublishMenu(date, unpublishedBy = null) {
    try {
      const menu = await DailyMenu.findByDate(date);
      if (!menu) {
        throw new NotFoundError('Daily menu not found for this date');
      }

      if (!menu.isPublished) {
        throw new ValidationError('Menu is already unpublished');
      }

      // Check if there are any pending orders for this date
      // This would require integration with order service
      // For now, we'll allow unpublishing

      await DailyMenu.unpublish(date);
      
      logger.info(`Menu unpublished for date: ${date}`, { unpublishedBy });

      const unpublishedMenu = await DailyMenu.findByDate(date);
      return {
        success: true,
        menu: unpublishedMenu,
        unpublishedAt: new Date(),
        unpublishedBy
      };
    } catch (error) {
      logger.error('Error unpublishing menu:', error);
      throw error;
    }
  }

  static async getPublishingStatus(date) {
    try {
      const menu = await DailyMenu.findByDate(date);
      if (!menu) {
        return {
          exists: false,
          isPublished: false,
          canPublish: false,
          reason: 'Menu does not exist for this date'
        };
      }

      const validation = await this.validateMenuForPublishing(date);
      const today = new Date().toISOString().split('T')[0];
      const isPastDate = date < today;

      return {
        exists: true,
        isPublished: menu.isPublished,
        canPublish: validation.valid && !isPastDate,
        canUnpublish: menu.isPublished,
        itemCount: menu.items.length,
        validationErrors: validation.valid ? [] : [validation.error],
        isPastDate
      };
    } catch (error) {
      logger.error('Error getting publishing status:', error);
      return {
        exists: false,
        isPublished: false,
        canPublish: false,
        reason: error.message
      };
    }
  }

  static async bulkPublishMenus(startDate, endDate, publishedBy = null) {
    try {
      const results = {
        successful: [],
        failed: [],
        summary: {
          total: 0,
          published: 0,
          failed: 0
        }
      };

      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateString = date.toISOString().split('T')[0];
        results.summary.total++;

        try {
          const result = await this.publishMenu(dateString, publishedBy);
          results.successful.push({
            date: dateString,
            result
          });
          results.summary.published++;
        } catch (error) {
          results.failed.push({
            date: dateString,
            error: error.message
          });
          results.summary.failed++;
        }
      }

      logger.info(`Bulk menu publishing completed`, results.summary);
      return results;
    } catch (error) {
      logger.error('Error in bulk menu publishing:', error);
      throw error;
    }
  }

  static async getAvailableMenusForOrdering(startDate = null, endDate = null) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const defaultStartDate = startDate || today;
      const defaultEndDate = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const menus = await DailyMenu.findByDateRange(defaultStartDate, defaultEndDate);
      
      // Filter only published menus for current and future dates
      const availableMenus = menus.filter(menu => {
        return menu.isPublished && 
               menu.date >= today && 
               menu.items.some(item => item.availableQuantity > item.soldQuantity);
      });

      // Add availability information to each menu item
      const menusWithAvailability = availableMenus.map(menu => ({
        ...menu,
        items: menu.items.map(item => ({
          ...item,
          remainingQuantity: item.availableQuantity - item.soldQuantity,
          isAvailable: (item.availableQuantity - item.soldQuantity) > 0
        })).filter(item => item.isAvailable) // Only show available items
      })).filter(menu => menu.items.length > 0); // Only show menus with available items

      return menusWithAvailability;
    } catch (error) {
      logger.error('Error getting available menus for ordering:', error);
      throw error;
    }
  }

  static async checkItemAvailabilityForOrder(date, foodItemId, requestedQuantity) {
    try {
      // Check if date is valid (not in past)
      const today = new Date().toISOString().split('T')[0];
      if (date < today) {
        return {
          available: false,
          reason: 'Cannot order from past dates',
          date,
          foodItemId,
          requestedQuantity
        };
      }

      // Get menu for the date
      const menu = await DailyMenu.findByDate(date);
      if (!menu) {
        return {
          available: false,
          reason: 'No menu available for this date',
          date,
          foodItemId,
          requestedQuantity
        };
      }

      // Check if menu is published
      if (!menu.isPublished) {
        return {
          available: false,
          reason: 'Menu is not published for this date',
          date,
          foodItemId,
          requestedQuantity
        };
      }

      // Find the specific item in the menu
      const menuItem = menu.items.find(item => item.foodItemId === foodItemId);
      if (!menuItem) {
        return {
          available: false,
          reason: 'Food item not available in menu for this date',
          date,
          foodItemId,
          requestedQuantity
        };
      }

      // Check quantity availability
      const remainingQuantity = menuItem.availableQuantity - menuItem.soldQuantity;
      const isAvailable = remainingQuantity >= requestedQuantity;

      return {
        available: isAvailable,
        reason: isAvailable ? 'Available' : 'Insufficient quantity available',
        date,
        foodItemId,
        requestedQuantity,
        remainingQuantity,
        menuItem
      };
    } catch (error) {
      logger.error('Error checking item availability for order:', error);
      return {
        available: false,
        reason: `Error checking availability: ${error.message}`,
        date,
        foodItemId,
        requestedQuantity
      };
    }
  }

  static async reserveItemsForOrder(date, items) {
    try {
      const reservationResults = [];
      
      for (const item of items) {
        const availability = await this.checkItemAvailabilityForOrder(
          date, 
          item.foodItemId, 
          item.quantity
        );

        if (!availability.available) {
          reservationResults.push({
            foodItemId: item.foodItemId,
            success: false,
            reason: availability.reason
          });
        } else {
          // Reserve the items by updating sold quantity
          await DailyMenu.updateInventory(date, item.foodItemId, item.quantity);
          reservationResults.push({
            foodItemId: item.foodItemId,
            success: true,
            quantity: item.quantity
          });
        }
      }

      const allSuccessful = reservationResults.every(result => result.success);
      
      if (!allSuccessful) {
        // Rollback successful reservations
        const successfulReservations = reservationResults.filter(result => result.success);
        for (const reservation of successfulReservations) {
          await DailyMenu.updateInventory(date, reservation.foodItemId, -reservation.quantity);
        }
      }

      return {
        success: allSuccessful,
        results: reservationResults,
        date
      };
    } catch (error) {
      logger.error('Error reserving items for order:', error);
      throw error;
    }
  }
}