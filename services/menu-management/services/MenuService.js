import { DailyMenu } from '../models/DailyMenu.js';
import { FoodItem } from '../models/FoodItem.js';
import { createLogger, ValidationError, NotFoundError } from '@tadbir-khowan/shared';

const logger = createLogger('menu-service');

export class MenuService {
  static async createDailyMenu(menuData) {
    try {
      // Validate required fields
      if (!menuData.date) {
        throw new ValidationError('Date is required');
      }

      // Check if menu already exists for this date
      const existingMenu = await DailyMenu.findByDate(menuData.date);
      if (existingMenu) {
        throw new ValidationError('Menu already exists for this date');
      }

      // Validate menu items if provided
      if (menuData.items && menuData.items.length > 0) {
        await this.validateMenuItems(menuData.items);
      }

      const menu = await DailyMenu.create(menuData);
      logger.info(`Daily menu created for date: ${menuData.date}`);
      return menu;
    } catch (error) {
      logger.error('Error creating daily menu:', error);
      throw error;
    }
  }

  static async getDailyMenu(date) {
    try {
      const menu = await DailyMenu.findByDate(date);
      if (!menu) {
        throw new NotFoundError('Daily menu not found for this date');
      }
      return menu;
    } catch (error) {
      logger.error('Error getting daily menu:', error);
      throw error;
    }
  }

  static async getMonthlyMenus(year, month) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      const menus = await DailyMenu.findByDateRange(startDate, endDate);
      return menus;
    } catch (error) {
      logger.error('Error getting monthly menus:', error);
      throw error;
    }
  }

  static async updateDailyMenu(date, updateData) {
    try {
      // Check if menu exists
      const existingMenu = await DailyMenu.findByDate(date);
      if (!existingMenu) {
        throw new NotFoundError('Daily menu not found for this date');
      }

      // Validate menu items if provided
      if (updateData.items && updateData.items.length > 0) {
        await this.validateMenuItems(updateData.items);
      }

      const menu = await DailyMenu.update(date, updateData);
      logger.info(`Daily menu updated for date: ${date}`);
      return menu;
    } catch (error) {
      logger.error('Error updating daily menu:', error);
      throw error;
    }
  }

  static async publishDailyMenu(date) {
    try {
      const menu = await DailyMenu.findByDate(date);
      if (!menu) {
        throw new NotFoundError('Daily menu not found for this date');
      }

      if (menu.items.length === 0) {
        throw new ValidationError('Cannot publish menu without items');
      }

      await DailyMenu.publish(date);
      logger.info(`Daily menu published for date: ${date}`);
      return await DailyMenu.findByDate(date);
    } catch (error) {
      logger.error('Error publishing daily menu:', error);
      throw error;
    }
  }

  static async unpublishDailyMenu(date) {
    try {
      const menu = await DailyMenu.findByDate(date);
      if (!menu) {
        throw new NotFoundError('Daily menu not found for this date');
      }

      await DailyMenu.unpublish(date);
      logger.info(`Daily menu unpublished for date: ${date}`);
      return await DailyMenu.findByDate(date);
    } catch (error) {
      logger.error('Error unpublishing daily menu:', error);
      throw error;
    }
  }

  static async deleteDailyMenu(date) {
    try {
      const menu = await DailyMenu.findByDate(date);
      if (!menu) {
        throw new NotFoundError('Daily menu not found for this date');
      }

      if (menu.isPublished) {
        throw new ValidationError('Cannot delete published menu');
      }

      await DailyMenu.delete(date);
      logger.info(`Daily menu deleted for date: ${date}`);
      return true;
    } catch (error) {
      logger.error('Error deleting daily menu:', error);
      throw error;
    }
  }

  static async createBulkMonthlyMenus(year, month, menuTemplate) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      const createdMenus = [];
      const errors = [];

      // Validate menu template
      if (menuTemplate.items && menuTemplate.items.length > 0) {
        await this.validateMenuItems(menuTemplate.items);
      }

      for (let day = 1; day <= endDate.getDate(); day++) {
        const currentDate = new Date(year, month - 1, day);
        const dateString = currentDate.toISOString().split('T')[0];

        try {
          // Check if menu already exists
          const existingMenu = await DailyMenu.findByDate(dateString);
          if (existingMenu) {
            errors.push({
              date: dateString,
              error: 'Menu already exists for this date'
            });
            continue;
          }

          // Create menu for this day
          const menuData = {
            date: dateString,
            items: menuTemplate.items || [],
            isPublished: menuTemplate.isPublished || false
          };

          const menu = await DailyMenu.create(menuData);
          createdMenus.push(menu);
          
        } catch (error) {
          errors.push({
            date: dateString,
            error: error.message
          });
        }
      }

      logger.info(`Bulk monthly menus created: ${createdMenus.length} successful, ${errors.length} errors`);
      
      return {
        success: createdMenus,
        errors: errors,
        summary: {
          total: endDate.getDate(),
          created: createdMenus.length,
          failed: errors.length
        }
      };
    } catch (error) {
      logger.error('Error creating bulk monthly menus:', error);
      throw error;
    }
  }

  static async checkItemAvailability(date, foodItemId, requestedQuantity) {
    try {
      const isAvailable = await DailyMenu.checkAvailability(date, foodItemId, requestedQuantity);
      return isAvailable;
    } catch (error) {
      logger.error('Error checking item availability:', error);
      throw error;
    }
  }

  static async updateInventory(date, foodItemId, quantitySold) {
    try {
      const updated = await DailyMenu.updateInventory(date, foodItemId, quantitySold);
      if (!updated) {
        throw new NotFoundError('Menu item not found for this date');
      }
      
      logger.info(`Inventory updated: ${quantitySold} units sold for item ${foodItemId} on ${date}`);
      return true;
    } catch (error) {
      logger.error('Error updating inventory:', error);
      throw error;
    }
  }

  static async validateMenuItems(items) {
    for (const item of items) {
      if (!item.foodItemId || !item.price || item.availableQuantity === undefined) {
        throw new ValidationError('Each menu item must have foodItemId, price, and availableQuantity');
      }

      if (item.price <= 0) {
        throw new ValidationError('Menu item price must be greater than 0');
      }

      if (item.availableQuantity < 0) {
        throw new ValidationError('Available quantity cannot be negative');
      }

      // Check if food item exists and is active
      const foodItem = await FoodItem.findById(item.foodItemId);
      if (!foodItem) {
        throw new ValidationError(`Food item with ID ${item.foodItemId} not found`);
      }

      if (!foodItem.isActive) {
        throw new ValidationError(`Food item ${foodItem.name} is not active`);
      }
    }
  }

  static async getAvailableMenus(startDate, endDate) {
    try {
      const menus = await DailyMenu.findByDateRange(startDate, endDate);
      
      // Filter only published menus and future dates
      const today = new Date().toISOString().split('T')[0];
      const availableMenus = menus.filter(menu => 
        menu.isPublished && menu.date >= today
      );

      return availableMenus;
    } catch (error) {
      logger.error('Error getting available menus:', error);
      throw error;
    }
  }
}