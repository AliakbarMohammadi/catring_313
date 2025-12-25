import express from 'express';
import { FoodItemService } from '../services/FoodItemService.js';
import { createLogger } from '@tadbir-khowan/shared';

const router = express.Router();
const logger = createLogger('food-items-routes');

// POST /menu/items - Create new food item
router.post('/', async (req, res, next) => {
  try {
    const foodItem = await FoodItemService.createFoodItem(req.body);
    res.status(201).json({
      success: true,
      data: foodItem,
      message: 'Food item created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /menu/items - Get all food items with optional filters
router.get('/', async (req, res, next) => {
  try {
    const filters = {};
    
    if (req.query.category) {
      filters.category = req.query.category;
    }
    
    if (req.query.isActive !== undefined) {
      filters.isActive = req.query.isActive === 'true';
    }

    const foodItems = await FoodItemService.getAllFoodItems(filters);
    res.json({
      success: true,
      data: foodItems,
      count: foodItems.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /menu/items/categories - Get all food categories
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await FoodItemService.getFoodCategories();
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
});

// GET /menu/items/:id - Get food item by ID
router.get('/:id', async (req, res, next) => {
  try {
    const foodItem = await FoodItemService.getFoodItemById(req.params.id);
    res.json({
      success: true,
      data: foodItem
    });
  } catch (error) {
    next(error);
  }
});

// PUT /menu/items/:id - Update food item
router.put('/:id', async (req, res, next) => {
  try {
    const foodItem = await FoodItemService.updateFoodItem(req.params.id, req.body);
    res.json({
      success: true,
      data: foodItem,
      message: 'Food item updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /menu/items/:id - Delete food item
router.delete('/:id', async (req, res, next) => {
  try {
    await FoodItemService.deleteFoodItem(req.params.id);
    res.json({
      success: true,
      message: 'Food item deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /menu/items/:id/deactivate - Deactivate food item
router.patch('/:id/deactivate', async (req, res, next) => {
  try {
    const foodItem = await FoodItemService.deactivateFoodItem(req.params.id);
    res.json({
      success: true,
      data: foodItem,
      message: 'Food item deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /menu/items/:id/activate - Activate food item
router.patch('/:id/activate', async (req, res, next) => {
  try {
    const foodItem = await FoodItemService.activateFoodItem(req.params.id);
    res.json({
      success: true,
      data: foodItem,
      message: 'Food item activated successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;