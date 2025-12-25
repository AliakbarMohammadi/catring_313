import express from 'express';
import { OrderService } from '../services/OrderService.js';
import { createLogger } from '@tadbir-khowan/shared';

const router = express.Router();
const logger = createLogger('orders-routes');

// POST /orders - Create new order
router.post('/', async (req, res, next) => {
  try {
    const order = await OrderService.createOrder(req.body);
    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /orders - Get all orders (admin/catering manager)
router.get('/', async (req, res, next) => {
  try {
    const filters = {};
    
    if (req.query.status) {
      filters.status = req.query.status;
    }
    
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

    const orders = await OrderService.getAllOrders(filters);
    res.json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /orders/:id - Get order by ID
router.get('/:id', async (req, res, next) => {
  try {
    const order = await OrderService.getOrderById(req.params.id);
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
});

// PUT /orders/:id/status - Update order status
router.put('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const updatedBy = req.user?.id || req.body.updatedBy;
    
    if (!status) {
      return res.status(400).json({
        error: {
          code: 'MISSING_STATUS',
          message: 'Status is required'
        }
      });
    }

    const order = await OrderService.updateOrderStatus(req.params.id, status, updatedBy);
    res.json({
      success: true,
      data: order,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /orders/:id - Cancel order
router.delete('/:id', async (req, res, next) => {
  try {
    const { reason } = req.body;
    const cancelledBy = req.user?.id || req.body.cancelledBy;
    
    const order = await OrderService.cancelOrder(req.params.id, reason, cancelledBy);
    res.json({
      success: true,
      data: order,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
});

// POST /orders/:id/confirm - Confirm order
router.post('/:id/confirm', async (req, res, next) => {
  try {
    const confirmedBy = req.user?.id || req.body.confirmedBy;
    const order = await OrderService.confirmOrder(req.params.id, confirmedBy);
    res.json({
      success: true,
      data: order,
      message: 'Order confirmed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /orders/user/:userId - Get orders for specific user
router.get('/user/:userId', async (req, res, next) => {
  try {
    const filters = {};
    
    if (req.query.status) {
      filters.status = req.query.status;
    }
    
    if (req.query.deliveryDate) {
      filters.deliveryDate = req.query.deliveryDate;
    }
    
    if (req.query.startDate && req.query.endDate) {
      filters.startDate = req.query.startDate;
      filters.endDate = req.query.endDate;
    }

    const orders = await OrderService.getUserOrders(req.params.userId, filters);
    res.json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /orders/company/:companyId - Get orders for specific company
router.get('/company/:companyId', async (req, res, next) => {
  try {
    const filters = {};
    
    if (req.query.status) {
      filters.status = req.query.status;
    }
    
    if (req.query.deliveryDate) {
      filters.deliveryDate = req.query.deliveryDate;
    }
    
    if (req.query.startDate && req.query.endDate) {
      filters.startDate = req.query.startDate;
      filters.endDate = req.query.endDate;
    }

    const orders = await OrderService.getCompanyOrders(req.params.companyId, filters);
    res.json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /orders/user/:userId/history - Get order history with summary
router.get('/user/:userId/history', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const result = await OrderService.getOrderHistory(req.params.userId, startDate, endDate);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// PUT /orders/:id/payment-status - Update payment status
router.put('/:id/payment-status', async (req, res, next) => {
  try {
    const { paymentStatus } = req.body;
    
    if (!paymentStatus) {
      return res.status(400).json({
        error: {
          code: 'MISSING_PAYMENT_STATUS',
          message: 'Payment status is required'
        }
      });
    }

    const order = await OrderService.updatePaymentStatus(req.params.id, paymentStatus);
    res.json({
      success: true,
      data: order,
      message: 'Payment status updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;