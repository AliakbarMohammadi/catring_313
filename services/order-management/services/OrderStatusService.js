import { Order } from '../models/Order.js';
import { createLogger, ValidationError, NotFoundError } from '@tadbir-khowan/shared';

const logger = createLogger('order-status-service');

export class OrderStatusService {
  static getValidStatuses() {
    return ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
  }

  static getStatusTransitions() {
    return {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['preparing', 'cancelled'],
      'preparing': ['ready', 'cancelled'],
      'ready': ['delivered'],
      'delivered': [], // Final state
      'cancelled': [] // Final state
    };
  }

  static getStatusDescriptions() {
    return {
      'pending': 'Order has been placed and is awaiting confirmation',
      'confirmed': 'Order has been confirmed and is being prepared',
      'preparing': 'Order is currently being prepared',
      'ready': 'Order is ready for pickup/delivery',
      'delivered': 'Order has been delivered to the customer',
      'cancelled': 'Order has been cancelled'
    };
  }

  static async updateOrderStatus(orderId, newStatus, updatedBy = null, notes = null) {
    try {
      // Validate status
      const validStatuses = this.getValidStatuses();
      if (!validStatuses.includes(newStatus)) {
        throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      // Get current order
      const order = await Order.findById(orderId);
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Validate status transition
      const validTransitions = this.getStatusTransitions();
      if (!validTransitions[order.status].includes(newStatus)) {
        throw new ValidationError(
          `Cannot change status from ${order.status} to ${newStatus}. ` +
          `Valid transitions from ${order.status}: ${validTransitions[order.status].join(', ')}`
        );
      }

      // Additional business rules
      await this.validateStatusChange(order, newStatus);

      // Update status
      const updatedOrder = await Order.updateStatus(orderId, newStatus);

      // Log status change
      logger.info(`Order status updated`, {
        orderId,
        fromStatus: order.status,
        toStatus: newStatus,
        updatedBy,
        notes
      });

      // Trigger status-specific actions
      await this.handleStatusChangeActions(updatedOrder, order.status, updatedBy);

      return updatedOrder;
    } catch (error) {
      logger.error('Error updating order status:', error);
      throw error;
    }
  }

  static async validateStatusChange(order, newStatus) {
    const today = new Date().toISOString().split('T')[0];

    switch (newStatus) {
      case 'confirmed':
        // Cannot confirm orders for past dates
        if (order.deliveryDate < today) {
          throw new ValidationError('Cannot confirm orders for past delivery dates');
        }
        break;

      case 'preparing':
        // Can only prepare confirmed orders
        if (order.status !== 'confirmed') {
          throw new ValidationError('Can only prepare confirmed orders');
        }
        break;

      case 'ready':
        // Can only mark as ready if currently preparing
        if (order.status !== 'preparing') {
          throw new ValidationError('Can only mark orders as ready if they are currently being prepared');
        }
        break;

      case 'delivered':
        // Can only deliver ready orders
        if (order.status !== 'ready') {
          throw new ValidationError('Can only deliver orders that are ready');
        }
        // Cannot deliver orders for future dates
        if (order.deliveryDate > today) {
          throw new ValidationError('Cannot deliver orders before their delivery date');
        }
        break;

      case 'cancelled':
        // Cannot cancel delivered orders
        if (order.status === 'delivered') {
          throw new ValidationError('Cannot cancel delivered orders');
        }
        // Cannot cancel on delivery day (business rule)
        if (order.deliveryDate <= today && order.status !== 'pending') {
          throw new ValidationError('Cannot cancel orders on or after delivery date');
        }
        break;
    }
  }

  static async handleStatusChangeActions(order, previousStatus, updatedBy) {
    try {
      switch (order.status) {
        case 'confirmed':
          await this.handleOrderConfirmation(order, updatedBy);
          break;

        case 'cancelled':
          await this.handleOrderCancellation(order, previousStatus, updatedBy);
          break;

        case 'delivered':
          await this.handleOrderDelivery(order, updatedBy);
          break;

        case 'ready':
          await this.handleOrderReady(order, updatedBy);
          break;
      }
    } catch (error) {
      logger.error('Error handling status change actions:', error);
      // Don't throw error here as the status update was successful
    }
  }

  static async handleOrderConfirmation(order, confirmedBy) {
    logger.info(`Order confirmed: ${order.id}`, { confirmedBy });
    
    // Here you would typically:
    // - Send confirmation notification to customer
    // - Notify kitchen/preparation team
    // - Update inventory reservations if needed
    
    // For now, just log the confirmation
  }

  static async handleOrderCancellation(order, previousStatus, cancelledBy) {
    logger.info(`Order cancelled: ${order.id}`, { previousStatus, cancelledBy });
    
    // Here you would typically:
    // - Release inventory reservations
    // - Process refunds if payment was made
    // - Send cancellation notification to customer
    // - Update analytics/reporting
  }

  static async handleOrderDelivery(order, deliveredBy) {
    logger.info(`Order delivered: ${order.id}`, { deliveredBy });
    
    // Here you would typically:
    // - Send delivery confirmation to customer
    // - Update delivery metrics
    // - Trigger post-delivery actions (feedback request, etc.)
  }

  static async handleOrderReady(order, updatedBy) {
    logger.info(`Order ready: ${order.id}`, { updatedBy });
    
    // Here you would typically:
    // - Send ready notification to customer
    // - Update pickup/delivery scheduling
  }

  static async getOrderStatusHistory(orderId) {
    try {
      // This would require a separate status_history table in a real implementation
      // For now, we'll return the current status information
      const order = await Order.findById(orderId);
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      return {
        orderId,
        currentStatus: order.status,
        statusDescription: this.getStatusDescriptions()[order.status],
        lastUpdated: order.updatedAt,
        // In a real implementation, this would include full history
        history: [
          {
            status: order.status,
            timestamp: order.updatedAt,
            description: this.getStatusDescriptions()[order.status]
          }
        ]
      };
    } catch (error) {
      logger.error('Error getting order status history:', error);
      throw error;
    }
  }

  static async getOrdersByStatus(status, filters = {}) {
    try {
      if (status && !this.getValidStatuses().includes(status)) {
        throw new ValidationError(`Invalid status: ${status}`);
      }

      const searchFilters = { ...filters };
      if (status) {
        searchFilters.status = status;
      }

      const orders = await Order.findAll(searchFilters);
      return orders;
    } catch (error) {
      logger.error('Error getting orders by status:', error);
      throw error;
    }
  }

  static async bulkUpdateOrderStatus(orderIds, newStatus, updatedBy = null) {
    try {
      const results = {
        successful: [],
        failed: [],
        summary: {
          total: orderIds.length,
          updated: 0,
          failed: 0
        }
      };

      for (const orderId of orderIds) {
        try {
          const updatedOrder = await this.updateOrderStatus(orderId, newStatus, updatedBy);
          results.successful.push({
            orderId,
            order: updatedOrder
          });
          results.summary.updated++;
        } catch (error) {
          results.failed.push({
            orderId,
            error: error.message
          });
          results.summary.failed++;
        }
      }

      logger.info(`Bulk status update completed`, results.summary);
      return results;
    } catch (error) {
      logger.error('Error in bulk status update:', error);
      throw error;
    }
  }

  static async getStatusStatistics(filters = {}) {
    try {
      const orders = await Order.findAll(filters);
      
      const statistics = {
        total: orders.length,
        byStatus: {},
        byDeliveryDate: {}
      };

      // Count by status
      this.getValidStatuses().forEach(status => {
        statistics.byStatus[status] = 0;
      });

      orders.forEach(order => {
        statistics.byStatus[order.status]++;
        
        // Count by delivery date
        const deliveryDate = order.deliveryDate;
        if (!statistics.byDeliveryDate[deliveryDate]) {
          statistics.byDeliveryDate[deliveryDate] = 0;
        }
        statistics.byDeliveryDate[deliveryDate]++;
      });

      return statistics;
    } catch (error) {
      logger.error('Error getting status statistics:', error);
      throw error;
    }
  }

  static async canCancelOrder(orderId) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        return { canCancel: false, reason: 'Order not found' };
      }

      const today = new Date().toISOString().split('T')[0];
      
      // Cannot cancel delivered orders
      if (order.status === 'delivered') {
        return { canCancel: false, reason: 'Cannot cancel delivered orders' };
      }

      // Cannot cancel on or after delivery date
      if (order.deliveryDate <= today && order.status !== 'pending') {
        return { canCancel: false, reason: 'Cannot cancel orders on or after delivery date' };
      }

      // Check if status allows cancellation
      const validTransitions = this.getStatusTransitions();
      if (!validTransitions[order.status].includes('cancelled')) {
        return { canCancel: false, reason: `Cannot cancel orders with status: ${order.status}` };
      }

      return { canCancel: true, reason: 'Order can be cancelled' };
    } catch (error) {
      logger.error('Error checking if order can be cancelled:', error);
      return { canCancel: false, reason: 'Error checking cancellation eligibility' };
    }
  }
}