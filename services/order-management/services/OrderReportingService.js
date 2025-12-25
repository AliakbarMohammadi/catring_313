import { Order } from '../models/Order.js';
import { createLogger, ValidationError } from '@tadbir-khowan/shared';

const logger = createLogger('order-reporting-service');

export class OrderReportingService {
  static async getUserOrderHistory(userId, options = {}) {
    try {
      const {
        startDate,
        endDate,
        status,
        limit = 50,
        offset = 0,
        includeItems = true
      } = options;

      const filters = {};
      
      if (startDate && endDate) {
        filters.startDate = startDate;
        filters.endDate = endDate;
      }
      
      if (status) {
        filters.status = status;
      }

      if (limit) {
        filters.limit = limit;
      }

      const orders = await Order.findByUserId(userId, filters);
      
      // Calculate summary statistics
      const summary = this.calculateOrderSummary(orders);
      
      // Group orders by month for better organization
      const ordersByMonth = this.groupOrdersByMonth(orders);

      return {
        userId,
        summary,
        ordersByMonth,
        orders: includeItems ? orders : orders.map(order => ({
          ...order,
          items: undefined // Remove items to reduce payload size
        })),
        pagination: {
          total: orders.length,
          limit,
          offset
        }
      };
    } catch (error) {
      logger.error('Error getting user order history:', error);
      throw error;
    }
  }

  static async getCompanyOrderReport(companyId, options = {}) {
    try {
      const {
        startDate,
        endDate,
        status,
        groupBy = 'date', // 'date', 'user', 'status'
        includeEmployeeBreakdown = true
      } = options;

      const filters = {};
      
      if (startDate && endDate) {
        filters.startDate = startDate;
        filters.endDate = endDate;
      }
      
      if (status) {
        filters.status = status;
      }

      const orders = await Order.findByCompanyId(companyId, filters);
      
      // Calculate company summary
      const summary = this.calculateOrderSummary(orders);
      
      // Group orders based on groupBy parameter
      let groupedOrders = {};
      switch (groupBy) {
        case 'date':
          groupedOrders = this.groupOrdersByDate(orders);
          break;
        case 'user':
          groupedOrders = this.groupOrdersByUser(orders);
          break;
        case 'status':
          groupedOrders = this.groupOrdersByStatus(orders);
          break;
        default:
          groupedOrders = { all: orders };
      }

      // Employee breakdown
      let employeeBreakdown = {};
      if (includeEmployeeBreakdown) {
        employeeBreakdown = this.calculateEmployeeBreakdown(orders);
      }

      return {
        companyId,
        period: { startDate, endDate },
        summary,
        groupedOrders,
        employeeBreakdown,
        reportGeneratedAt: new Date()
      };
    } catch (error) {
      logger.error('Error getting company order report:', error);
      throw error;
    }
  }

  static async getOrderAnalytics(filters = {}) {
    try {
      const {
        startDate,
        endDate,
        companyId,
        userId
      } = filters;

      let orders;
      if (companyId) {
        orders = await Order.findByCompanyId(companyId, filters);
      } else if (userId) {
        orders = await Order.findByUserId(userId, filters);
      } else {
        orders = await Order.findAll(filters);
      }

      const analytics = {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, order) => sum + order.finalAmount, 0),
        averageOrderValue: 0,
        statusDistribution: {},
        dailyTrends: {},
        topItems: {},
        customerMetrics: {
          totalCustomers: new Set(orders.map(order => order.userId)).size,
          repeatCustomers: 0,
          newCustomers: 0
        },
        periodComparison: null
      };

      if (analytics.totalOrders > 0) {
        analytics.averageOrderValue = analytics.totalRevenue / analytics.totalOrders;
      }

      // Status distribution
      orders.forEach(order => {
        analytics.statusDistribution[order.status] = 
          (analytics.statusDistribution[order.status] || 0) + 1;
      });

      // Daily trends
      orders.forEach(order => {
        const date = order.deliveryDate;
        if (!analytics.dailyTrends[date]) {
          analytics.dailyTrends[date] = {
            orders: 0,
            revenue: 0,
            averageValue: 0
          };
        }
        analytics.dailyTrends[date].orders++;
        analytics.dailyTrends[date].revenue += order.finalAmount;
        analytics.dailyTrends[date].averageValue = 
          analytics.dailyTrends[date].revenue / analytics.dailyTrends[date].orders;
      });

      // Top items analysis
      const itemCounts = {};
      orders.forEach(order => {
        order.items.forEach(item => {
          if (!itemCounts[item.foodItemId]) {
            itemCounts[item.foodItemId] = {
              quantity: 0,
              revenue: 0,
              orders: 0
            };
          }
          itemCounts[item.foodItemId].quantity += item.quantity;
          itemCounts[item.foodItemId].revenue += item.totalPrice;
          itemCounts[item.foodItemId].orders++;
        });
      });

      // Convert to sorted array
      analytics.topItems = Object.entries(itemCounts)
        .map(([foodItemId, stats]) => ({
          foodItemId,
          ...stats
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      // Customer metrics (simplified - would need more complex logic for repeat customers)
      const customerOrderCounts = {};
      orders.forEach(order => {
        customerOrderCounts[order.userId] = (customerOrderCounts[order.userId] || 0) + 1;
      });

      analytics.customerMetrics.repeatCustomers = 
        Object.values(customerOrderCounts).filter(count => count > 1).length;
      analytics.customerMetrics.newCustomers = 
        analytics.customerMetrics.totalCustomers - analytics.customerMetrics.repeatCustomers;

      return analytics;
    } catch (error) {
      logger.error('Error getting order analytics:', error);
      throw error;
    }
  }

  static calculateOrderSummary(orders) {
    const summary = {
      totalOrders: orders.length,
      totalAmount: 0,
      totalDiscount: 0,
      finalAmount: 0,
      averageOrderValue: 0,
      statusBreakdown: {},
      dateRange: {
        earliest: null,
        latest: null
      }
    };

    if (orders.length === 0) {
      return summary;
    }

    orders.forEach(order => {
      summary.totalAmount += order.totalAmount;
      summary.totalDiscount += order.discountAmount;
      summary.finalAmount += order.finalAmount;
      
      // Status breakdown
      summary.statusBreakdown[order.status] = 
        (summary.statusBreakdown[order.status] || 0) + 1;
      
      // Date range
      const orderDate = new Date(order.createdAt);
      if (!summary.dateRange.earliest || orderDate < summary.dateRange.earliest) {
        summary.dateRange.earliest = orderDate;
      }
      if (!summary.dateRange.latest || orderDate > summary.dateRange.latest) {
        summary.dateRange.latest = orderDate;
      }
    });

    summary.averageOrderValue = summary.finalAmount / summary.totalOrders;

    return summary;
  }

  static groupOrdersByMonth(orders) {
    const grouped = {};
    
    orders.forEach(order => {
      const date = new Date(order.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(order);
    });

    return grouped;
  }

  static groupOrdersByDate(orders) {
    const grouped = {};
    
    orders.forEach(order => {
      const date = order.deliveryDate;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(order);
    });

    return grouped;
  }

  static groupOrdersByUser(orders) {
    const grouped = {};
    
    orders.forEach(order => {
      if (!grouped[order.userId]) {
        grouped[order.userId] = [];
      }
      grouped[order.userId].push(order);
    });

    return grouped;
  }

  static groupOrdersByStatus(orders) {
    const grouped = {};
    
    orders.forEach(order => {
      if (!grouped[order.status]) {
        grouped[order.status] = [];
      }
      grouped[order.status].push(order);
    });

    return grouped;
  }

  static calculateEmployeeBreakdown(orders) {
    const breakdown = {};
    
    orders.forEach(order => {
      if (!breakdown[order.userId]) {
        breakdown[order.userId] = {
          totalOrders: 0,
          totalAmount: 0,
          averageOrderValue: 0,
          lastOrderDate: null,
          favoriteItems: {}
        };
      }
      
      const userStats = breakdown[order.userId];
      userStats.totalOrders++;
      userStats.totalAmount += order.finalAmount;
      userStats.averageOrderValue = userStats.totalAmount / userStats.totalOrders;
      
      const orderDate = new Date(order.createdAt);
      if (!userStats.lastOrderDate || orderDate > userStats.lastOrderDate) {
        userStats.lastOrderDate = orderDate;
      }
      
      // Track favorite items
      order.items.forEach(item => {
        if (!userStats.favoriteItems[item.foodItemId]) {
          userStats.favoriteItems[item.foodItemId] = 0;
        }
        userStats.favoriteItems[item.foodItemId] += item.quantity;
      });
    });

    // Convert favorite items to sorted arrays
    Object.keys(breakdown).forEach(userId => {
      const favoriteItems = breakdown[userId].favoriteItems;
      breakdown[userId].favoriteItems = Object.entries(favoriteItems)
        .map(([foodItemId, quantity]) => ({ foodItemId, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5); // Top 5 favorite items
    });

    return breakdown;
  }

  static async exportOrderReport(filters = {}, format = 'json') {
    try {
      const {
        companyId,
        userId,
        startDate,
        endDate
      } = filters;

      let orders;
      if (companyId) {
        orders = await Order.findByCompanyId(companyId, filters);
      } else if (userId) {
        orders = await Order.findByUserId(userId, filters);
      } else {
        orders = await Order.findAll(filters);
      }

      const reportData = {
        generatedAt: new Date(),
        filters,
        summary: this.calculateOrderSummary(orders),
        orders: orders.map(order => ({
          id: order.id,
          userId: order.userId,
          companyId: order.companyId,
          orderDate: order.orderDate,
          deliveryDate: order.deliveryDate,
          status: order.status,
          paymentStatus: order.paymentStatus,
          totalAmount: order.totalAmount,
          discountAmount: order.discountAmount,
          finalAmount: order.finalAmount,
          itemCount: order.items.length,
          items: order.items
        }))
      };

      switch (format.toLowerCase()) {
        case 'csv':
          return this.convertToCSV(reportData);
        case 'json':
        default:
          return JSON.stringify(reportData, null, 2);
      }
    } catch (error) {
      logger.error('Error exporting order report:', error);
      throw error;
    }
  }

  static convertToCSV(reportData) {
    const headers = [
      'Order ID',
      'User ID',
      'Company ID',
      'Order Date',
      'Delivery Date',
      'Status',
      'Payment Status',
      'Total Amount',
      'Discount Amount',
      'Final Amount',
      'Item Count'
    ];

    const rows = reportData.orders.map(order => [
      order.id,
      order.userId,
      order.companyId || '',
      order.orderDate,
      order.deliveryDate,
      order.status,
      order.paymentStatus,
      order.totalAmount,
      order.discountAmount,
      order.finalAmount,
      order.itemCount
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }

  static async getDashboardMetrics(filters = {}) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Today's metrics
      const todayOrders = await Order.findAll({
        ...filters,
        deliveryDate: today
      });

      // Yesterday's metrics for comparison
      const yesterdayOrders = await Order.findAll({
        ...filters,
        deliveryDate: yesterday
      });

      const metrics = {
        today: {
          orders: todayOrders.length,
          revenue: todayOrders.reduce((sum, order) => sum + order.finalAmount, 0),
          averageOrderValue: todayOrders.length > 0 ? 
            todayOrders.reduce((sum, order) => sum + order.finalAmount, 0) / todayOrders.length : 0,
          statusBreakdown: {}
        },
        yesterday: {
          orders: yesterdayOrders.length,
          revenue: yesterdayOrders.reduce((sum, order) => sum + order.finalAmount, 0),
          averageOrderValue: yesterdayOrders.length > 0 ? 
            yesterdayOrders.reduce((sum, order) => sum + order.finalAmount, 0) / yesterdayOrders.length : 0
        },
        trends: {
          ordersChange: 0,
          revenueChange: 0,
          averageOrderValueChange: 0
        }
      };

      // Calculate status breakdown for today
      todayOrders.forEach(order => {
        metrics.today.statusBreakdown[order.status] = 
          (metrics.today.statusBreakdown[order.status] || 0) + 1;
      });

      // Calculate trends
      if (yesterdayOrders.length > 0) {
        metrics.trends.ordersChange = 
          ((metrics.today.orders - metrics.yesterday.orders) / metrics.yesterday.orders) * 100;
        metrics.trends.revenueChange = 
          ((metrics.today.revenue - metrics.yesterday.revenue) / metrics.yesterday.revenue) * 100;
        metrics.trends.averageOrderValueChange = 
          ((metrics.today.averageOrderValue - metrics.yesterday.averageOrderValue) / metrics.yesterday.averageOrderValue) * 100;
      }

      return metrics;
    } catch (error) {
      logger.error('Error getting dashboard metrics:', error);
      throw error;
    }
  }
}