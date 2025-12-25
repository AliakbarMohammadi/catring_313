import express from 'express';
import { PaymentService } from '../services/PaymentService.js';
import { createLogger } from '@tadbir-khowan/shared';

const router = express.Router();
const logger = createLogger('payment-routes');

// Process payment
router.post('/process', async (req, res, next) => {
  try {
    const payment = await PaymentService.processPayment(req.body);
    res.json({
      success: true,
      data: payment,
      message: 'Payment processed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get payment by ID
router.get('/:id', async (req, res, next) => {
  try {
    const payment = await PaymentService.getPaymentById(req.params.id);
    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
});

// Get payments by order ID
router.get('/order/:orderId', async (req, res, next) => {
  try {
    const payments = await PaymentService.getPaymentsByOrderId(req.params.orderId);
    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    next(error);
  }
});

// Refund payment
router.post('/:id/refund', async (req, res, next) => {
  try {
    const payment = await PaymentService.refundPayment(req.params.id, req.body);
    res.json({
      success: true,
      data: payment,
      message: 'Payment refunded successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Retry failed payment
router.post('/:id/retry', async (req, res, next) => {
  try {
    const payment = await PaymentService.retryFailedPayment(req.params.id);
    res.json({
      success: true,
      data: payment,
      message: 'Payment retry initiated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get payment history
router.get('/', async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: parseInt(req.query.limit) || 100
    };

    const payments = await PaymentService.getPaymentHistory(filters);
    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    next(error);
  }
});

export default router;