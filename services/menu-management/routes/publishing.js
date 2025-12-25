import express from 'express';
import { MenuPublishingService } from '../services/MenuPublishingService.js';
import { validatePublishingPermissions, validateDateParameter, validateFutureDate } from '../middleware/availability.js';
import { createLogger } from '@tadbir-khowan/shared';

const router = express.Router();
const logger = createLogger('publishing-routes');

// GET /menu/publishing/status/:date - Get publishing status for a date
router.get('/status/:date', validateDateParameter, async (req, res, next) => {
  try {
    const status = await MenuPublishingService.getPublishingStatus(req.params.date);
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
});

// POST /menu/publishing/publish/:date - Publish menu for a date
router.post('/publish/:date', 
  validateDateParameter, 
  validatePublishingPermissions, 
  async (req, res, next) => {
    try {
      const publishedBy = req.body.publishedBy || req.user?.id || 'system';
      const result = await MenuPublishingService.publishMenu(req.params.date, publishedBy);
      res.json({
        success: true,
        data: result,
        message: 'Menu published successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /menu/publishing/unpublish/:date - Unpublish menu for a date
router.post('/unpublish/:date', 
  validateDateParameter, 
  validatePublishingPermissions, 
  async (req, res, next) => {
    try {
      const unpublishedBy = req.body.unpublishedBy || req.user?.id || 'system';
      const result = await MenuPublishingService.unpublishMenu(req.params.date, unpublishedBy);
      res.json({
        success: true,
        data: result,
        message: 'Menu unpublished successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /menu/publishing/bulk-publish - Bulk publish menus for date range
router.post('/bulk-publish', validatePublishingPermissions, async (req, res, next) => {
  try {
    const { startDate, endDate, publishedBy } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FIELDS',
          message: 'Start date and end date are required'
        }
      });
    }

    const result = await MenuPublishingService.bulkPublishMenus(
      startDate, 
      endDate, 
      publishedBy || req.user?.id || 'system'
    );
    
    res.json({
      success: true,
      data: result,
      message: `Bulk publishing completed: ${result.summary.published} published, ${result.summary.failed} failed`
    });
  } catch (error) {
    next(error);
  }
});

// GET /menu/publishing/available-for-ordering - Get menus available for ordering
router.get('/available-for-ordering', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const menus = await MenuPublishingService.getAvailableMenusForOrdering(startDate, endDate);
    
    res.json({
      success: true,
      data: menus,
      count: menus.length
    });
  } catch (error) {
    next(error);
  }
});

// POST /menu/publishing/check-availability - Check item availability for ordering
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

    const availability = await MenuPublishingService.checkItemAvailabilityForOrder(
      date, 
      foodItemId, 
      quantity
    );
    
    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    next(error);
  }
});

// POST /menu/publishing/reserve-items - Reserve items for order (internal use)
router.post('/reserve-items', async (req, res, next) => {
  try {
    const { date, items } = req.body;
    
    if (!date || !items || !Array.isArray(items)) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FIELDS',
          message: 'Date and items array are required'
        }
      });
    }

    const result = await MenuPublishingService.reserveItemsForOrder(date, items);
    
    if (result.success) {
      res.json({
        success: true,
        data: result,
        message: 'Items reserved successfully'
      });
    } else {
      res.status(409).json({
        success: false,
        data: result,
        message: 'Some items could not be reserved'
      });
    }
  } catch (error) {
    next(error);
  }
});

export default router;