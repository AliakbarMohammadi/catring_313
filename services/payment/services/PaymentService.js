import { Payment } from '../models/Payment.js';
import { FinancialRecord } from '../models/FinancialRecord.js';
import { createLogger, ValidationError, NotFoundError, BusinessLogicError } from '@tadbir-khowan/shared';
import axios from 'axios';

const logger = createLogger('payment-service');

export class PaymentService {
  static async processPayment(paymentData) {
    try {
      // Validate required fields
      if (!paymentData.orderId || !paymentData.amount || !paymentData.method) {
        throw new ValidationError('Order ID, amount, and payment method are required');
      }

      // Validate payment method
      const validMethods = ['credit_card', 'bank_transfer', 'wallet'];
      if (!validMethods.includes(paymentData.method)) {
        throw new ValidationError(`Invalid payment method. Must be one of: ${validMethods.join(', ')}`);
      }

      // Validate amount
      if (paymentData.amount <= 0) {
        throw new ValidationError('Payment amount must be greater than 0');
      }

      // Check if order exists and get order details
      const orderDetails = await this.getOrderDetails(paymentData.orderId);
      if (!orderDetails) {
        throw new NotFoundError('Order not found');
      }

      // Validate payment amount matches order amount
      if (Math.abs(paymentData.amount - orderDetails.finalAmount) > 0.01) {
        throw new ValidationError('Payment amount does not match order amount');
      }

      // Check if order is already paid
      const existingPayments = await Payment.findByOrderId(paymentData.orderId);
      const successfulPayment = existingPayments.find(p => p.status === 'completed');
      if (successfulPayment) {
        throw new BusinessLogicError('Order is already paid');
      }

      // Create payment record
      const payment = await Payment.create({
        orderId: paymentData.orderId,
        amount: paymentData.amount,
        method: paymentData.method,
        status: 'pending'
      });

      // Process payment with gateway
      const gatewayResult = await this.processWithGateway(payment, paymentData);

      // Update payment status based on gateway result
      const updatedPayment = await Payment.updateStatus(
        payment.id,
        gatewayResult.success ? 'completed' : 'failed',
        gatewayResult.transactionId,
        gatewayResult.response
      );

      // Create financial record for audit
      await FinancialRecord.create({
        transactionType: 'payment',
        referenceId: payment.id,
        userId: orderDetails.userId,
        companyId: orderDetails.companyId,
        amount: payment.amount,
        description: `Payment for order ${paymentData.orderId}`,
        metadata: {
          paymentMethod: payment.method,
          orderId: paymentData.orderId,
          gatewayTransactionId: gatewayResult.transactionId
        }
      });

      // Update order payment status
      if (gatewayResult.success) {
        await this.updateOrderPaymentStatus(paymentData.orderId, 'paid');
        logger.info(`Payment completed successfully: ${payment.id} for order: ${paymentData.orderId}`);
      } else {
        await this.updateOrderPaymentStatus(paymentData.orderId, 'failed');
        logger.warn(`Payment failed: ${payment.id} for order: ${paymentData.orderId}`, gatewayResult.response);
      }

      return updatedPayment;
    } catch (error) {
      logger.error('Error processing payment:', error);
      throw error;
    }
  }

  static async processWithGateway(payment, paymentData) {
    try {
      // Simulate payment gateway processing
      // In a real implementation, this would integrate with actual payment gateways
      // like Stripe, PayPal, or local Iranian gateways like Zarinpal, Mellat, etc.
      
      const gatewayResponse = await this.simulateGatewayCall(payment, paymentData);
      
      return {
        success: gatewayResponse.status === 'success',
        transactionId: gatewayResponse.transactionId,
        response: gatewayResponse
      };
    } catch (error) {
      logger.error('Gateway processing error:', error);
      return {
        success: false,
        transactionId: null,
        response: { error: error.message, timestamp: new Date().toISOString() }
      };
    }
  }

  static async simulateGatewayCall(payment, paymentData) {
    // Simulate different gateway responses based on payment method
    const delay = Math.random() * 2000 + 500; // 0.5-2.5 seconds delay
    await new Promise(resolve => setTimeout(resolve, delay));

    // Simulate success/failure rates
    const successRate = {
      'credit_card': 0.95,
      'bank_transfer': 0.98,
      'wallet': 0.99
    };

    const isSuccess = Math.random() < successRate[payment.method];
    
    if (isSuccess) {
      return {
        status: 'success',
        transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        gatewayReference: `GW_${payment.method.toUpperCase()}_${Date.now()}`,
        amount: payment.amount,
        currency: 'IRR',
        timestamp: new Date().toISOString()
      };
    } else {
      const errorCodes = ['INSUFFICIENT_FUNDS', 'CARD_DECLINED', 'NETWORK_ERROR', 'INVALID_CARD'];
      const errorCode = errorCodes[Math.floor(Math.random() * errorCodes.length)];
      
      return {
        status: 'failed',
        errorCode,
        errorMessage: this.getErrorMessage(errorCode),
        timestamp: new Date().toISOString()
      };
    }
  }

  static getErrorMessage(errorCode) {
    const messages = {
      'INSUFFICIENT_FUNDS': 'Insufficient funds in account',
      'CARD_DECLINED': 'Card was declined by issuer',
      'NETWORK_ERROR': 'Network error occurred during processing',
      'INVALID_CARD': 'Invalid card information provided'
    };
    return messages[errorCode] || 'Unknown error occurred';
  }

  static async getOrderDetails(orderId) {
    try {
      const orderServiceUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3004';
      const response = await axios.get(`${orderServiceUrl}/orders/${orderId}`);
      
      if (response.data.success) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      logger.error('Error fetching order details:', error);
      return null;
    }
  }

  static async updateOrderPaymentStatus(orderId, paymentStatus) {
    try {
      const orderServiceUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3004';
      await axios.patch(`${orderServiceUrl}/orders/${orderId}/payment-status`, {
        paymentStatus
      });
    } catch (error) {
      logger.error('Error updating order payment status:', error);
      // Don't throw error here as payment processing should still complete
    }
  }

  static async getPaymentById(id) {
    try {
      const payment = await Payment.findById(id);
      if (!payment) {
        throw new NotFoundError('Payment not found');
      }
      return payment;
    } catch (error) {
      logger.error('Error getting payment by id:', error);
      throw error;
    }
  }

  static async getPaymentsByOrderId(orderId) {
    try {
      const payments = await Payment.findByOrderId(orderId);
      return payments;
    } catch (error) {
      logger.error('Error getting payments by order id:', error);
      throw error;
    }
  }

  static async refundPayment(paymentId, refundData) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new NotFoundError('Payment not found');
      }

      if (payment.status !== 'completed') {
        throw new BusinessLogicError('Can only refund completed payments');
      }

      // Validate refund amount
      const refundAmount = refundData.amount || payment.amount;
      if (refundAmount <= 0 || refundAmount > payment.amount) {
        throw new ValidationError('Invalid refund amount');
      }

      // Process refund with gateway
      const refundResult = await this.processRefundWithGateway(payment, refundAmount, refundData.reason);

      if (refundResult.success) {
        // Update payment status to refunded
        const updatedPayment = await Payment.updateStatus(
          paymentId,
          'refunded',
          refundResult.transactionId,
          refundResult.response
        );

        // Get order details for financial record
        const orderDetails = await this.getOrderDetails(payment.orderId);

        // Create financial record for refund
        await FinancialRecord.create({
          transactionType: 'refund',
          referenceId: paymentId,
          userId: orderDetails?.userId,
          companyId: orderDetails?.companyId,
          amount: refundAmount,
          description: `Refund for payment ${paymentId}. Reason: ${refundData.reason || 'No reason provided'}`,
          metadata: {
            originalPaymentId: paymentId,
            refundReason: refundData.reason,
            refundTransactionId: refundResult.transactionId
          }
        });

        logger.info(`Payment refunded successfully: ${paymentId}, amount: ${refundAmount}`);
        return updatedPayment;
      } else {
        throw new BusinessLogicError(`Refund failed: ${refundResult.response?.errorMessage || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('Error processing refund:', error);
      throw error;
    }
  }

  static async processRefundWithGateway(payment, refundAmount, reason) {
    try {
      // Simulate refund gateway processing
      const delay = Math.random() * 1500 + 300; // 0.3-1.8 seconds delay
      await new Promise(resolve => setTimeout(resolve, delay));

      // Simulate high success rate for refunds
      const isSuccess = Math.random() < 0.98;
      
      if (isSuccess) {
        return {
          success: true,
          transactionId: `REFUND_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          response: {
            status: 'success',
            refundAmount,
            originalTransactionId: payment.transactionId,
            reason,
            timestamp: new Date().toISOString()
          }
        };
      } else {
        return {
          success: false,
          transactionId: null,
          response: {
            status: 'failed',
            errorCode: 'REFUND_FAILED',
            errorMessage: 'Refund could not be processed at this time',
            timestamp: new Date().toISOString()
          }
        };
      }
    } catch (error) {
      logger.error('Refund gateway processing error:', error);
      return {
        success: false,
        transactionId: null,
        response: { error: error.message, timestamp: new Date().toISOString() }
      };
    }
  }

  static async getPaymentHistory(filters = {}) {
    try {
      let payments = [];

      if (filters.status) {
        payments = await Payment.findByStatus(filters.status, filters.limit);
      } else if (filters.startDate && filters.endDate) {
        payments = await Payment.findByDateRange(filters.startDate, filters.endDate, filters.limit);
      } else {
        // Default: get recent payments
        payments = await Payment.findByStatus('completed', filters.limit || 100);
      }

      return payments;
    } catch (error) {
      logger.error('Error getting payment history:', error);
      throw error;
    }
  }

  static async retryFailedPayment(paymentId) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new NotFoundError('Payment not found');
      }

      if (payment.status !== 'failed') {
        throw new BusinessLogicError('Can only retry failed payments');
      }

      // Get original order details
      const orderDetails = await this.getOrderDetails(payment.orderId);
      if (!orderDetails) {
        throw new NotFoundError('Associated order not found');
      }

      // Create new payment attempt
      return await this.processPayment({
        orderId: payment.orderId,
        amount: payment.amount,
        method: payment.method
      });
    } catch (error) {
      logger.error('Error retrying failed payment:', error);
      throw error;
    }
  }
}