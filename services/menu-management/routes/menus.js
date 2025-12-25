import express from 'express';
import { MenuService } from '../services/MenuService.js';
import { createLogger } from '@tadbir-khowan/shared';

const router = express.Router();
const logger = createLogger('menus-routes');

// POST /menu/daily - Create daily menu
router.post('/daily', async (req, res, next) => {
  try {
    const menu = await MenuService.createDailyMenu(req.body);
    res.status(201).json({
      success: true,
      data: menu,
      message: 'Daily menu created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /menu/daily/:date - Get daily menu by date
router.get('/daily/:date', async (req, res, next) => {
  try {
    const menu = await MenuService.getDailyMenu(req.params.date);
    res.json({
      success: true,
      data: menu
    });
  } catch (error) {
    next(error);
  }
});

// PUT /menu/daily/:date - Update daily menu
router.put('/daily/:date', async (req, res, next) => {
  try {
    const menu = await MenuService.updateDailyMenu(req.params.date, req.body);
    res.json({
      success: true,
      data: menu,
      message: 'Daily menu updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /menu/daily/:date - Delete daily menu
router.delete('/daily/:date', async (req, res, next) => {
  try {
    await MenuService.deleteDailyMenu(req.params.date);
    res.json({
      success: true,
      message: 'Daily menu deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /menu/daily/:date/publish - Publish daily menu
router.patch('/daily/:date/publish', async (req, res, next) => {
  try {
    const menu = await MenuService.publishDailyMenu(req.params.date);
    res.json({
      success: true,
      data: menu,
      message: 'Daily menu published successfully'
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /menu/daily/:date/unpublish - Unpublish daily menu
router.patch('/daily/:date/unpublish', async (req, res, next) => {
  try {
    const menu = await MenuService.unpublishDailyMenu(req.params.date);
    res.json({
      success: true,
      data: menu,
      message: 'Daily menu unpublished successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /menu/monthly/:year/:month - Get monthly menus
router.get('/monthly/:year/:month', async (req, res, next) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({
        error: {
          code: 'INVALID_DATE',
          message: 'Invalid year or month provided'
        }
      });
    }

    const menus = await MenuService.getMonthlyMenus(year, month);
    res.json({
      success: true,
      data: menus,
      count: menus.length
    });
  } catch (error) {
    next(error);
  }
});

// POST /menu/monthly/:year/:month/bulk - Create bulk monthly menus
router.post('/monthly/:year/:month/bulk', async (req, res, next) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({
        error: {
          code: 'INVALID_DATE',
          message: 'Invalid year or month provided'
        }
      });
    }

    const result = await MenuService.createBulkMonthlyMenus(year, month, req.body);
    res.status(201).json({
      success: true,
      data: result,
      message: `Bulk menu creation completed: ${result.summary.created} created, ${result.summary.failed} failed`
    });
  } catch (error) {
    next(error);
  }
});

// GET /menu/available - Get available menus for ordering
router.get('/available', async (req, res, next) => {
  try {
    const startDate = req.query.startDate || new Date().toISOString().split('T')[0];
    const endDate = req.query.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const menus = await MenuService.getAvailableMenus(startDate, endDate);
    res.json({
      success: true,
      data: menus,
      count: menus.length
    });
  } catch (error) {
    next(error);
  }
});

// POST /menu/check-availability - Check item availability
router.post('/check-availability', async (req, res, next) => {
  try {
    const { date, foodItemId, quantity } = req.body;
    
    if (!date || !foodItemId || !quantity) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FIELDS',
          message: 'Date, foodItemId, and quantity are required'
        }
      });
    }

    const isAvailable = await MenuService.checkItemAvailability(date, foodItemId, quantity);
    res.json({
      success: true,
      data: {
        available: isAvailable,
        date,
        foodItemId,
        requestedQuantity: quantity
      }
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /menu/inventory/update - Update inventory (for order processing)
router.patch('/inventory/update', async (req, res, next) => {
  try {
    const { date, foodItemId, quantitySold } = req.body;
    
    if (!date || !foodItemId || quantitySold === undefined) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FIELDS',
          message: 'Date, foodItemId, and quantitySold are required'
        }
      });
    }

    await MenuService.updateInventory(date, foodItemId, quantitySold);
    res.json({
      success: true,
      message: 'Inventory updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;