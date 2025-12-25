import express from 'express';
import { OrderReportingService } from '../services/OrderReportingService.js';
import { createLogger } from '@tadbir-khowan/shared';

const router = express.Router();
const logger = createLogger('reports-routes');

// GET /orders/reports/user/:userId/history - Get user order history
router.get('/user/:userId/history', async (req, res, next) => {
  try {
    const options = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      status: req.query.status,
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
      includeItems: req.query.includeItems !== 'false'
    };

    const history = await OrderReportingService.getUserOrderHistory(req.params.userId, options);
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
});

// GET /orders/reports/company/:companyId - Get company order report
router.get('/company/:companyId', async (req, res, next) => {
  try {
    const options = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      status: req.query.status,
      groupBy: req.query.groupBy || 'date',
      includeEmployeeBreakdown: req.query.includeEmployeeBreakdown !== 'false'
    };

    const report = await OrderReportingService.getCompanyOrderReport(req.params.companyId, options);
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
});

// GET /orders/reports/analytics - Get order analytics
router.get('/analytics', async (req, res, next) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      companyId: req.query.companyId,
      userId: req.query.userId
    };

    const analytics = await OrderReportingService.getOrderAnalytics(filters);
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
});

// GET /orders/reports/dashboard - Get dashboard metrics
router.get('/dashboard', async (req, res, next) => {
  try {
    const filters = {
      companyId: req.query.companyId,
      userId: req.query.userId
    };

    const metrics = await OrderReportingService.getDashboardMetrics(filters);
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    next(error);
  }
});

// GET /orders/reports/export - Export order report
router.get('/export', async (req, res, next) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      companyId: req.query.companyId,
      userId: req.query.userId,
      status: req.query.status
    };

    const format = req.query.format || 'json';
    const reportData = await OrderReportingService.exportOrderReport(filters, format);

    // Set appropriate headers based on format
    if (format.toLowerCase() === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=order-report.csv');
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=order-report.json');
    }

    res.send(reportData);
  } catch (error) {
    next(error);
  }
});

// GET /orders/reports/summary - Get order summary for date range
router.get('/summary', async (req, res, next) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      companyId: req.query.companyId,
      userId: req.query.userId,
      status: req.query.status
    };

    // Get analytics which includes summary information
    const analytics = await OrderReportingService.getOrderAnalytics(filters);
    
    // Extract summary information
    const summary = {
      totalOrders: analytics.totalOrders,
      totalRevenue: analytics.totalRevenue,
      averageOrderValue: analytics.averageOrderValue,
      statusDistribution: analytics.statusDistribution,
      customerMetrics: analytics.customerMetrics,
      period: {
        startDate: filters.startDate,
        endDate: filters.endDate
      },
      generatedAt: new Date()
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
});

// GET /orders/reports/trends - Get order trends over time
router.get('/trends', async (req, res, next) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      companyId: req.query.companyId,
      userId: req.query.userId
    };

    const analytics = await OrderReportingService.getOrderAnalytics(filters);
    
    // Extract trend information
    const trends = {
      dailyTrends: analytics.dailyTrends,
      topItems: analytics.topItems,
      statusDistribution: analytics.statusDistribution,
      period: {
        startDate: filters.startDate,
        endDate: filters.endDate
      }
    };

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    next(error);
  }
});

// POST /orders/reports/custom - Generate custom report
router.post('/custom', async (req, res, next) => {
  try {
    const {
      filters = {},
      groupBy = 'date',
      metrics = ['orders', 'revenue', 'averageOrderValue'],
      includeDetails = false
    } = req.body;

    let reportData;

    if (filters.companyId) {
      reportData = await OrderReportingService.getCompanyOrderReport(filters.companyId, {
        ...filters,
        groupBy,
        includeEmployeeBreakdown: includeDetails
      });
    } else if (filters.userId) {
      reportData = await OrderReportingService.getUserOrderHistory(filters.userId, {
        ...filters,
        includeItems: includeDetails
      });
    } else {
      reportData = await OrderReportingService.getOrderAnalytics(filters);
    }

    // Filter metrics based on request
    const customReport = {
      filters,
      groupBy,
      requestedMetrics: metrics,
      data: reportData,
      generatedAt: new Date()
    };

    res.json({
      success: true,
      data: customReport
    });
  } catch (error) {
    next(error);
  }
});

export default router;