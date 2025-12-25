import express from 'express';
import { Analytics } from '../models/Analytics.js';
import { ValidationError, createLogger } from '@tadbir-khowan/shared';
import { query } from '../config/database.js';

const router = express.Router();
const logger = createLogger('analytics-routes');

// دریافت متریک‌های داشبورد
router.get('/metrics', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new ValidationError('تاریخ شروع و پایان الزامی است');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ValidationError('فرمت تاریخ نامعتبر است');
    }

    if (start >= end) {
      throw new ValidationError('تاریخ شروع باید قبل از تاریخ پایان باشد');
    }

    const metrics = await Analytics.getDashboardMetrics(start, end);

    res.json({
      success: true,
      message: 'متریک‌های داشبورد با موفقیت دریافت شد',
      metrics
    });
  } catch (error) {
    next(error);
  }
});

// دریافت آنالیتیک موجودی
router.get('/inventory', async (req, res, next) => {
  try {
    const { date } = req.query;
    
    let analysisDate = new Date();
    if (date) {
      analysisDate = new Date(date);
      if (isNaN(analysisDate.getTime())) {
        throw new ValidationError('فرمت تاریخ نامعتبر است');
      }
    }

    const inventoryAnalytics = await Analytics.getInventoryAnalytics(analysisDate);

    res.json({
      success: true,
      message: 'آنالیتیک موجودی با موفقیت دریافت شد',
      analytics: inventoryAnalytics
    });
  } catch (error) {
    next(error);
  }
});

// دریافت آنالیتیک مشتریان
router.get('/customers', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new ValidationError('تاریخ شروع و پایان الزامی است');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ValidationError('فرمت تاریخ نامعتبر است');
    }

    if (start >= end) {
      throw new ValidationError('تاریخ شروع باید قبل از تاریخ پایان باشد');
    }

    const customerAnalytics = await Analytics.getCustomerAnalytics(start, end);

    res.json({
      success: true,
      message: 'آنالیتیک مشتریان با موفقیت دریافت شد',
      analytics: customerAnalytics
    });
  } catch (error) {
    next(error);
  }
});

// دریافت آنالیتیک درآمد
router.get('/revenue', async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    if (!startDate || !endDate) {
      throw new ValidationError('تاریخ شروع و پایان الزامی است');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ValidationError('فرمت تاریخ نامعتبر است');
    }

    if (start >= end) {
      throw new ValidationError('تاریخ شروع باید قبل از تاریخ پایان باشد');
    }

    const validGroupBy = ['hour', 'day', 'week', 'month'];
    if (!validGroupBy.includes(groupBy)) {
      throw new ValidationError(`groupBy باید یکی از موارد زیر باشد: ${validGroupBy.join(', ')}`);
    }

    const revenueAnalytics = await Analytics.getRevenueAnalytics(start, end, groupBy);

    res.json({
      success: true,
      message: 'آنالیتیک درآمد با موفقیت دریافت شد',
      analytics: revenueAnalytics
    });
  } catch (error) {
    next(error);
  }
});

// دریافت آمار عملکرد بر اساس دسته‌بندی غذا
router.get('/food-categories', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new ValidationError('تاریخ شروع و پایان الزامی است');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ValidationError('فرمت تاریخ نامعتبر است');
    }

    // آمار فروش بر اساس دسته‌بندی
    const categoryStatsResult = await query(`
      SELECT 
        fi.category,
        COUNT(DISTINCT o.id) as order_count,
        SUM((item->>'quantity')::integer) as total_quantity,
        SUM((item->>'totalPrice')::numeric) as total_revenue,
        AVG((item->>'unitPrice')::numeric) as average_price
      FROM orders o,
      jsonb_array_elements(o.items) as item
      JOIN food_items fi ON fi.id = (item->>'foodItemId')::uuid
      WHERE o.created_at >= $1 AND o.created_at <= $2
      AND o.status NOT IN ('cancelled')
      GROUP BY fi.category
      ORDER BY total_revenue DESC
    `, [start, end]);

    const categoryAnalytics = {
      period: { startDate: start, endDate: end },
      categories: categoryStatsResult.rows.map(row => ({
        category: row.category,
        orderCount: parseInt(row.order_count),
        totalQuantity: parseInt(row.total_quantity),
        totalRevenue: parseFloat(row.total_revenue),
        averagePrice: parseFloat(row.average_price)
      })),
      summary: {
        totalCategories: categoryStatsResult.rows.length,
        totalRevenue: categoryStatsResult.rows.reduce((sum, row) => sum + parseFloat(row.total_revenue), 0),
        mostPopular: categoryStatsResult.rows[0]?.category || null
      }
    };

    res.json({
      success: true,
      message: 'آنالیتیک دسته‌بندی غذا با موفقیت دریافت شد',
      analytics: categoryAnalytics
    });
  } catch (error) {
    next(error);
  }
});

// دریافت آمار عملکرد ساعتی
router.get('/hourly-performance', async (req, res, next) => {
  try {
    const { date } = req.query;

    let analysisDate = new Date();
    if (date) {
      analysisDate = new Date(date);
      if (isNaN(analysisDate.getTime())) {
        throw new ValidationError('فرمت تاریخ نامعتبر است');
      }
    }

    const startOfDay = new Date(analysisDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(analysisDate);
    endOfDay.setHours(23, 59, 59, 999);

    // آمار ساعتی
    const hourlyStatsResult = await query(`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as order_count,
        SUM(final_amount) as revenue,
        AVG(final_amount) as average_order_value
      FROM orders 
      WHERE created_at >= $1 AND created_at <= $2
      AND status NOT IN ('cancelled')
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `, [startOfDay, endOfDay]);

    // تولید آرایه کامل ۲۴ ساعته
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const hourData = hourlyStatsResult.rows.find(row => parseInt(row.hour) === hour);
      return {
        hour,
        orderCount: hourData ? parseInt(hourData.order_count) : 0,
        revenue: hourData ? parseFloat(hourData.revenue) : 0,
        averageOrderValue: hourData ? parseFloat(hourData.average_order_value) : 0
      };
    });

    // یافتن ساعت‌های پیک
    const peakHours = hourlyData
      .filter(data => data.orderCount > 0)
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 3);

    const hourlyAnalytics = {
      date: analysisDate,
      hourlyData,
      peakHours,
      summary: {
        totalOrders: hourlyData.reduce((sum, data) => sum + data.orderCount, 0),
        totalRevenue: hourlyData.reduce((sum, data) => sum + data.revenue, 0),
        busiestHour: peakHours[0]?.hour || null,
        quietestHour: hourlyData.filter(d => d.orderCount > 0).sort((a, b) => a.orderCount - b.orderCount)[0]?.hour || null
      }
    };

    res.json({
      success: true,
      message: 'آنالیتیک عملکرد ساعتی با موفقیت دریافت شد',
      analytics: hourlyAnalytics
    });
  } catch (error) {
    next(error);
  }
});

export default router;