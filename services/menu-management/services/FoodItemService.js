import { FoodItem } from '../models/FoodItem.js';
import { createLogger, ValidationError, NotFoundError } from '@tadbir-khowan/shared';

const logger = createLogger('food-item-service');

export class FoodItemService {
  static async createFoodItem(foodItemData) {
    try {
      // Validate required fields
      if (!foodItemData.name || !foodItemData.category || !foodItemData.basePrice) {
        throw new ValidationError('Name, category, and base price are required');
      }

      if (foodItemData.basePrice <= 0) {
        throw new ValidationError('Base price must be greater than 0');
      }

      const foodItem = await FoodItem.create(foodItemData);
      logger.info(`Food item created: ${foodItem.id}`);
      return foodItem;
    } catch (error) {
      logger.error('Error creating food item:', error);
      throw error;
    }
  }

  static async getFoodItemById(id) {
    try {
      const foodItem = await FoodItem.findById(id);
      if (!foodItem) {
        throw new NotFoundError('Food item not found');
      }
      return foodItem;
    } catch (error) {
      logger.error('Error getting food item by id:', error);
      throw error;
    }
  }

  static async getAllFoodItems(filters = {}) {
    try {
      const foodItems = await FoodItem.findAll(filters);
      return foodItems;
    } catch (error) {
      logger.error('Error getting all food items:', error);
      throw error;
    }
  }

  static async updateFoodItem(id, updateData) {
    try {
      // Validate base price if provided
      if (updateData.basePrice !== undefined && updateData.basePrice <= 0) {
        throw new ValidationError('Base price must be greater than 0');
      }

      const foodItem = await FoodItem.update(id, updateData);
      if (!foodItem) {
        throw new NotFoundError('Food item not found');
      }

      logger.info(`Food item updated: ${id}`);
      return foodItem;
    } catch (error) {
      logger.error('Error updating food item:', error);
      throw error;
    }
  }

  static async deleteFoodItem(id) {
    try {
      const deleted = await FoodItem.delete(id);
      if (!deleted) {
        throw new NotFoundError('Food item not found');
      }

      logger.info(`Food item deleted: ${id}`);
      return true;
    } catch (error) {
      logger.error('Error deleting food item:', error);
      throw error;
    }
  }

  static async getFoodCategories() {
    try {
      const categories = await FoodItem.getCategories();
      return categories;
    } catch (error) {
      logger.error('Error getting food categories:', error);
      throw error;
    }
  }

  static async deactivateFoodItem(id) {
    try {
      const foodItem = await this.updateFoodItem(id, { isActive: false });
      logger.info(`Food item deactivated: ${id}`);
      return foodItem;
    } catch (error) {
      logger.error('Error deactivating food item:', error);
      throw error;
    }
  }

  static async activateFoodItem(id) {
    try {
      const foodItem = await this.updateFoodItem(id, { isActive: true });
      logger.info(`Food item activated: ${id}`);
      return foodItem;
    } catch (error) {
      logger.error('Error activating food item:', error);
      throw error;
    }
  }
}