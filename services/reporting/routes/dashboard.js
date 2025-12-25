import express from 'express';
import { ReportingService } from '../services/ReportingService.js';
import { ValidationError, createLogger } from '@tadbir-khowan/shared';

const router = express.Router();
const logger = createLogger('dashboard-routes');
const reportingService = new ReportingService();

// دریافت آنالیتیک کلی داشبورد
router.get('/analytics', async (req, res, next) => {
  try {
    const { startDate, endDate, period = 'week' } = req.query;

    let start, end;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new ValidationError('فرمت تاریخ نامعتبر است');
      }
    } else {
      // تنظیم بازه زمانی پیش‌فرض بر اساس دوره
      const now = new Date();
      end = new Date(now);
      
      switch (period) {
        case 'today':
          start = new Date(now);
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          break;
        case 'week':
          start = new Date(now);
          start.setDate(now.getDate() - 7);
          break;
        case 'month':
          start = new Date(now);
          start.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          start = new Date(now);
          start.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          start = new Date(now);
          start.setFullYear(now.getFullYear() - 1);
          break;
        default:
          start = new Date(now);
          start.setDate(now.getDate() - 7);
      }
    }

    const analytics = await reportingService.getDashboardAnalytics(start, end);

    res.json({
      success: true,
      message: 'آنالیتیک داشبورد با موفقیت دریافت شد',
      analytics
    });
  } catch (error) {
    next(error);
  }
});

// دریافت گزارش موجودی
router.get('/inventory', async (req, res, next) => {
  try {
    const { date } = req.query;
    
    let reportDate = new Date();
    if (date) {
      reportDate = new Date(date);
      if (isNaN(reportDate.getTime())) {
        throw new ValidationError('فرمت تاریخ نامعتبر است');
      }
    }

    const inventoryReport = await reportingService.getInventoryReport(reportDate);

    res.json({
      success: true,
      message: 'گزارش موجودی با موفقیت دریافت شد',
      inventory: inventoryReport
    });
  } catch (error) {
    next(error);
  }
});

// دریافت بینش مشتریان
router.get('/customers', async (req, res, next) => {
  try {
    const { startDate, endDate, period = 'month' } = req.query;

    let start, end;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new ValidationError('فرمت تاریخ نامعتبر است');
      }
    } else {
      const now = new Date();
      end = new Date(now);
      
      switch (period) {
        case 'week':
          start = new Date(now);
          start.setDate(now.getDate() - 7);
          break;
        case 'month':
          start = new Date(now);
          start.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          start = new Date(now);
          start.setMonth(now.getMonth() - 3);
          break;
        default:
          start = new Date(now);
          start.setMonth(now.getMonth() - 1);
      }
    }

    const customerInsights = await reportingService.getCustomerInsights(start, end);

    res.json({
      success: true,
      message: 'بینش مشتریان با موفقیت دریافت شد',
      insights: customerInsights
    });
  } catch (error) {
    next(error);
  }
});

// دریافت تحلیل درآمد
router.get('/revenue', async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day', period = 'month' } = req.query;

    let start, end;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new ValidationError('فرمت تاریخ نامعتبر است');
      }
    } else {
      const now = new Date();
      end = new Date(now);
      
      switch (period) {
        case 'week':
          start = new Date(now);
          start.setDate(now.getDate() - 7);
          break;
        case 'month':
          start = new Date(now);
          start.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          start = new Date(now);
          start.setMonth(now.getMonth() - 3);
          break;
        default:
          start = new Date(now);
          start.setMonth(now.getMonth() - 1);
      }
    }

    // اعتبارسنجی groupBy
    const validGroupBy = ['hour', 'day', 'week', 'month'];
    if (!validGroupBy.includes(groupBy)) {
      throw new ValidationError(`groupBy باید یکی از موارد زیر باشد: ${validGroupBy.join(', ')}`);
    }

    const revenueAnalysis = await reportingService.getRevenueAnalysis(start, end, groupBy);

    res.json({
      success: true,
      message: 'تحلیل درآمد با موفقیت دریافت شد',
      analysis: revenueAnalysis
    });
  } catch (error) {
    next(error);
  }
});

// دریافت خلاصه عملکرد
router.get('/summary', async (req, res, next) => {
  try {
    const now = new Date();
    
    // آمار امروز
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // آمار این هفته
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    // آمار این ماه
    const monthStart = new Date(now);
    monthStart.setMonth(now.getMonth() - 1);

    const [todayAnalytics, weekAnalytics, monthAnalytics, inventoryReport] = await Promise.all([
      reportingService.getDashboardAnalytics(todayStart, todayEnd),
      reportingService.getDashboardAnalytics(weekStart, now),
      reportingService.getDashboardAnalytics(monthStart, now),
      reportingService.getInventoryReport(now)
    ]);

    const summary = {
      today: {
        orders: todayAnalytics.dashboard.overview.totalOrders,
        revenue: todayAnalytics.dashboard.overview.totalRevenue,
        customers: todayAnalytics.dashboard.overview.uniqueCustomers
      },
      week: {
        orders: weekAnalytics.dashboard.overview.totalOrders,
        revenue: weekAnalytics.dashboard.overview.totalRevenue,
        customers: weekAnalytics.dashboard.overview.uniqueCustomers,
        growth: {
          orders: weekAnalytics.dashboard.overview.orderGrowth,
          revenue: weekAnalytics.dashboard.overview.revenueGrowth
        }
      },
      month: {
        orders: monthAnalytics.dashboard.overview.totalOrders,
        revenue: monthAnalytics.dashboard.overview.totalRevenue,
        customers: monthAnalytics.dashboard.overview.uniqueCustomers,
        companies: monthAnalytics.dashboard.overview.activeCompanies
      },
      inventory: {
        lowStockItems: inventoryReport.alerts.lowStockCount,
        criticalItems: inventoryReport.alerts.criticalItems.length,
        totalCategories: Object.keys(inventoryReport.categoryStats).length
      },
      generatedAt: new Date()
    };

    res.json({
      success: true,
      message: 'خلاصه عملکرد با موفقیت دریافت شد',
      summary
    });
  } catch (error) {
    next(error);
  }
});

export default router;