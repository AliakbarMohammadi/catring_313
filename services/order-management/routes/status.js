import express from 'express';
import { OrderStatusService } from '../services/OrderStatusService.js';
import { createLogger } from '@tadbir-khowan/shared';

const router = express.Router();
const logger = createLogger('status-routes');

// GET /orders/status/definitions - Get status definitions and transitions
router.get('/definitions', async (req, res, next) => {
  try {
    const definitions = {
      validStatuses: OrderStatusService.getValidStatuses(),
      statusTransitions: OrderStatusService.getStatusTransitions(),
      statusDescriptions: OrderStatusService.getStatusDescriptions()
    };

    res.json({
      success: true,
      data: definitions
    });
  } catch (error) {
    next(error);
  }
});

// PUT /orders/status/:orderId - Update order status
router.put('/:orderId', async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const updatedBy = req.user?.id || req.body.updatedBy;

    if (!status) {
      return res.status(400).json({
        error: {
          code: 'MISSING_STATUS',
          message: 'Status is required'
        }
      });
    }

    const order = await OrderStatusService.updateOrderStatus(
      req.params.orderId,
      status,
      updatedBy,
      notes
    );

    res.json({
      success: true,
      data: order,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /orders/status/:orderId/history - Get order status history
router.get('/:orderId/history', async (req, res, next) => {
  try {
    const history = await OrderStatusService.getOrderStatusHistory(req.params.orderId);
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
});

// GET /orders/status/by-status/:status - Get orders by status
router.get('/by-status/:status', async (req, res, next) => {
  try {
    const filters = {};
    
    if (req.query.deliveryDate) {
      filters.deliveryDate = req.query.deliveryDate;
    }
    
    if (req.query.startDate && req.query.endDate) {
      filters.startDate = req.query.startDate;
      filters.endDate = req.query.endDate;
    }
    
    if (req.query.limit) {
      filters.limit = parseInt(req.query.limit);
    }

    const orders = await OrderStatusService.getOrdersByStatus(req.params.status, filters);
    res.json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    next(error);
  }
});

// POST /orders/status/bulk-update - Bulk update order statuses
router.post('/bulk-update', async (req, res, next) => {
  try {
    const { orderIds, status } = req.body;
    const updatedBy = req.user?.id || req.body.updatedBy;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        error: {
          code: 'MISSING_ORDER_IDS',
          message: 'Order IDs array is required'
        }
      });
    }

    if (!status) {
      return res.status(400).json({
        error: {
          code: 'MISSING_STATUS',
          message: 'Status is required'
        }
      });
    }

    const result = await OrderStatusService.bulkUpdateOrderStatus(orderIds, status, updatedBy);
    res.json({
      success: true,
      data: result,
      message: `Bulk update completed: ${result.summary.updated} updated, ${result.summary.failed} failed`
    });
  } catch (error) {
    next(error);
  }
});

// GET /orders/status/statistics - Get status statistics
router.get('/statistics', async (req, res, next) => {
  try {
    const filters = {};
    
    if (req.query.deliveryDate) {
      filters.deliveryDate = req.query.deliveryDate;
    }
    
    if (req.query.startDate && req.query.endDate) {
      filters.startDate = req.query.startDate;
      filters.endDate = req.query.endDate;
    }

    const statistics = await OrderStatusService.getStatusStatistics(filters);
    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
});

// GET /orders/status/:orderId/can-cancel - Check if order can be cancelled
router.get('/:orderId/can-cancel', async (req, res, next) => {
  try {
    const result = await OrderStatusService.canCancelOrder(req.params.orderId);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// POST /orders/status/:orderId/confirm - Confirm order (shortcut)
router.post('/:orderId/confirm', async (req, res, next) => {
  try {
    const updatedBy = req.user?.id || req.body.updatedBy;
    const notes = req.body.notes;

    const order = await OrderStatusService.updateOrderStatus(
      req.params.orderId,
      'confirmed',
      updatedBy,
      notes
    );

    res.json({
      success: true,
      data: order,
      message: 'Order confirmed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// POST /orders/status/:orderId/prepare - Start preparing order (shortcut)
router.post('/:orderId/prepare', async (req, res, next) => {
  try {
    const updatedBy = req.user?.id || req.body.updatedBy;
    const notes = req.body.notes;

    const order = await OrderStatusService.updateOrderStatus(
      req.params.orderId,
      'preparing',
      updatedBy,
      notes
    );

    res.json({
      success: true,
      data: order,
      message: 'Order preparation started successfully'
    });
  } catch (error) {
    next(error);
  }
});

// POST /orders/status/:orderId/ready - Mark order as ready (shortcut)
router.post('/:orderId/ready', async (req, res, next) => {
  try {
    const updatedBy = req.user?.id || req.body.updatedBy;
    const notes = req.body.notes;

    const order = await OrderStatusService.updateOrderStatus(
      req.params.orderId,
      'ready',
      updatedBy,
      notes
    );

    res.json({
      success: true,
      data: order,
      message: 'Order marked as ready successfully'
    });
  } catch (error) {
    next(error);
  }
});

// POST /orders/status/:orderId/deliver - Mark order as delivered (shortcut)
router.post('/:orderId/deliver', async (req, res, next) => {
  try {
    const updatedBy = req.user?.id || req.body.updatedBy;
    const notes = req.body.notes;

    const order = await OrderStatusService.updateOrderStatus(
      req.params.orderId,
      'delivered',
      updatedBy,
      notes
    );

    res.json({
      success: true,
      data: order,
      message: 'Order delivered successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;