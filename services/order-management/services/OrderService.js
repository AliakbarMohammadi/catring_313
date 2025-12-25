import { Order } from '../models/Order.js';
import { createLogger, ValidationError, NotFoundError } from '@tadbir-khowan/shared';
import axios from 'axios';

const logger = createLogger('order-service');

export class OrderService {
  static async createOrder(orderData) {
    try {
      // Validate required fields
      if (!orderData.userId || !orderData.deliveryDate || !orderData.items || orderData.items.length === 0) {
        throw new ValidationError('User ID, delivery date, and items are required');
      }

      // Validate delivery date is not in the past
      const today = new Date().toISOString().split('T')[0];
      if (orderData.deliveryDate < today) {
        throw new ValidationError('Cannot create order for past dates');
      }

      // Validate and calculate order totals
      const validatedOrder = await this.validateAndCalculateOrder(orderData);

      // Check item availability with menu service
      await this.checkItemAvailability(validatedOrder.deliveryDate, validatedOrder.items);

      // Create the order
      const order = await Order.create(validatedOrder);

      // Reserve items in menu service
      await this.reserveItems(order.deliveryDate, order.items);

      logger.info(`Order created: ${order.id} for user: ${order.userId}`);
      return order;
    } catch (error) {
      logger.error('Error creating order:', error);
      throw error;
    }
  }

  static async validateAndCalculateOrder(orderData) {
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of orderData.items) {
      if (!item.foodItemId || !item.quantity || !item.unitPrice) {
        throw new ValidationError('Each item must have foodItemId, quantity, and unitPrice');
      }

      if (item.quantity <= 0) {
        throw new ValidationError('Item quantity must be greater than 0');
      }

      if (item.unitPrice <= 0) {
        throw new ValidationError('Item unit price must be greater than 0');
      }

      const itemTotal = item.quantity * item.unitPrice;
      validatedItems.push({
        foodItemId: item.foodItemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: itemTotal
      });

      totalAmount += itemTotal;
    }

    const discountAmount = orderData.discountAmount || 0;
    const finalAmount = totalAmount - discountAmount;

    if (finalAmount < 0) {
      throw new ValidationError('Final amount cannot be negative');
    }

    return {
      ...orderData,
      items: validatedItems,
      totalAmount,
      discountAmount,
      finalAmount
    };
  }

  static async checkItemAvailability(deliveryDate, items) {
    try {
      const menuServiceUrl = process.env.MENU_SERVICE_URL || 'http://localhost:3003';
      
      for (const item of items) {
        const response = await axios.post(`${menuServiceUrl}/menu/publishing/check-availability`, {
          date: deliveryDate,
          foodItemId: item.foodItemId,
          quantity: item.quantity
        });

        if (!response.data.success || !response.data.data.available) {
          throw new ValidationError(`Item ${item.foodItemId} is not available in requested quantity for ${deliveryDate}`);
        }
      }
    } catch (error) {
      if (error.response) {
        logger.error('Menu service availability check failed:', error.response.data);
        throw new ValidationError('Unable to verify item availability');
      }
      throw error;
    }
  }

  static async reserveItems(deliveryDate, items) {
    try {
      const menuServiceUrl = process.env.MENU_SERVICE_URL || 'http://localhost:3003';
      
      const response = await axios.post(`${menuServiceUrl}/menu/publishing/reserve-items`, {
        date: deliveryDate,
        items: items.map(item => ({
          foodItemId: item.foodItemId,
          quantity: item.quantity
        }))
      });

      if (!response.data.success) {
        throw new ValidationError('Unable to reserve items for order');
      }
    } catch (error) {
      if (error.response) {
        logger.error('Menu service reservation failed:', error.response.data);
        throw new ValidationError('Unable to reserve items for order');
      }
      throw error;
    }
  }

  static async getOrderById(id) {
    try {
      const order = await Order.findById(id);
      if (!order) {
        throw new NotFoundError('Order not found');
      }
      return order;
    } catch (error) {
      logger.error('Error getting order by id:', error);
      throw error;
    }
  }

  static async getUserOrders(userId, filters = {}) {
    try {
      const orders = await Order.findByUserId(userId, filters);
      return orders;
    } catch (error) {
      logger.error('Error getting user orders:', error);
      throw error;
    }
  }

  static async getCompanyOrders(companyId, filters = {}) {
    try {
      const orders = await Order.findByCompanyId(companyId, filters);
      return orders;
    } catch (error) {
      logger.error('Error getting company orders:', error);
      throw error;
    }
  }

  static async getAllOrders(filters = {}) {
    try {
      const orders = await Order.findAll(filters);
      return orders;
    } catch (error) {
      logger.error('Error getting all orders:', error);
      throw error;
    }
  }

  static async updateOrderStatus(id, status, updatedBy = null) {
    try {
      const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      const order = await Order.findById(id);
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Validate status transitions
      const validTransitions = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['preparing', 'cancelled'],
        'preparing': ['ready', 'cancelled'],
        'ready': ['delivered'],
        'delivered': [], // Final state
        'cancelled': [] // Final state
      };

      if (!validTransitions[order.status].includes(status)) {
        throw new ValidationError(`Cannot change status from ${order.status} to ${status}`);
      }

      const updatedOrder = await Order.updateStatus(id, status);
      
      logger.info(`Order status updated: ${id} from ${order.status} to ${status}`, { updatedBy });
      return updatedOrder;
    } catch (error) {
      logger.error('Error updating order status:', error);
      throw error;
    }
  }

  static async cancelOrder(id, reason = null, cancelledBy = null) {
    try {
      const order = await Order.findById(id);
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Check if order can be cancelled
      const cancellableStatuses = ['pending', 'confirmed'];
      if (!cancellableStatuses.includes(order.status)) {
        throw new ValidationError(`Cannot cancel order with status: ${order.status}`);
      }

      // Check cancellation deadline (e.g., cannot cancel on delivery day)
      const today = new Date().toISOString().split('T')[0];
      if (order.deliveryDate <= today) {
        throw new ValidationError('Cannot cancel order on or after delivery date');
      }

      const cancelledOrder = await Order.cancel(id, reason);

      // Release reserved items back to menu service
      await this.releaseReservedItems(order.deliveryDate, order.items);

      logger.info(`Order cancelled: ${id}`, { reason, cancelledBy });
      return cancelledOrder;
    } catch (error) {
      logger.error('Error cancelling order:', error);
      throw error;
    }
  }

  static async releaseReservedItems(deliveryDate, items) {
    try {
      const menuServiceUrl = process.env.MENU_SERVICE_URL || 'http://localhost:3003';
      
      // Release items by updating inventory with negative quantities
      for (const item of items) {
        await axios.patch(`${menuServiceUrl}/menu/inventory/update`, {
          date: deliveryDate,
          foodItemId: item.foodItemId,
          quantitySold: -item.quantity // Negative to release
        });
      }
    } catch (error) {
      logger.error('Error releasing reserved items:', error);
      // Don't throw error here as order cancellation should still succeed
    }
  }

  static async confirmOrder(id, confirmedBy = null) {
    try {
      const updatedOrder = await this.updateOrderStatus(id, 'confirmed', confirmedBy);
      
      // Send confirmation notification (would integrate with notification service)
      logger.info(`Order confirmed: ${id}`, { confirmedBy });
      
      return updatedOrder;
    } catch (error) {
      logger.error('Error confirming order:', error);
      throw error;
    }
  }

  static async getOrderHistory(userId, startDate = null, endDate = null) {
    try {
      const filters = {};
      
      if (startDate && endDate) {
        filters.startDate = startDate;
        filters.endDate = endDate;
      }

      const orders = await Order.findByUserId(userId, filters);
      
      // Calculate summary statistics
      const summary = {
        totalOrders: orders.length,
        totalAmount: orders.reduce((sum, order) => sum + order.finalAmount, 0),
        statusBreakdown: {}
      };

      orders.forEach(order => {
        summary.statusBreakdown[order.status] = (summary.statusBreakdown[order.status] || 0) + 1;
      });

      return {
        orders,
        summary
      };
    } catch (error) {
      logger.error('Error getting order history:', error);
      throw error;
    }
  }

  static async updatePaymentStatus(id, paymentStatus) {
    try {
      const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
      if (!validPaymentStatuses.includes(paymentStatus)) {
        throw new ValidationError(`Invalid payment status. Must be one of: ${validPaymentStatuses.join(', ')}`);
      }

      const updatedOrder = await Order.updatePaymentStatus(id, paymentStatus);
      if (!updatedOrder) {
        throw new NotFoundError('Order not found');
      }

      logger.info(`Order payment status updated: ${id} to ${paymentStatus}`);
      return updatedOrder;
    } catch (error) {
      logger.error('Error updating payment status:', error);
      throw error;
    }
  }
}