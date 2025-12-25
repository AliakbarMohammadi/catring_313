import express from 'express';
import { CateringManagerService } from '../services/CateringManagerService.js';
import { ValidationError, NotFoundError, createLogger } from '@tadbir-khowan/shared';
import { query } from '../config/database.js';

const router = express.Router();
const logger = createLogger('manager-routes');
const managerService = new CateringManagerService();

// دریافت داشبورد کامل مدیر کترینگ
router.get('/dashboard', async (req, res, next) => {
  try {
    const dashboard = await managerService.getManagerDashboard();

    res.json({
      success: true,
      message: 'داشبورد مدیر کترینگ با موفقیت دریافت شد',
      dashboard
    });
  } catch (error) {
    next(error);
  }
});

// دریافت خلاصه فروش روزانه
router.get('/daily-summary', async (req, res, next) => {
  try {
    const { date } = req.query;
    
    let summaryDate = new Date();
    if (date) {
      summaryDate = new Date(date);
      if (isNaN(summaryDate.getTime())) {
        throw new ValidationError('فرمت تاریخ نامعتبر است');
      }
    }

    const summary = await managerService.getDailySalesSummary(summaryDate);

    res.json({
      success: true,
      message: 'خلاصه فروش روزانه با موفقیت دریافت شد',
      summary
    });
  } catch (error) {
    next(error);
  }
});

// دریافت داده‌های مدیریت سفارشات
router.get('/orders', async (req, res, next) => {
  try {
    const {
      status,
      companyId,
      userId,
      startDate,
      endDate,
      limit = 20,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    // اعتبارسنجی تاریخ‌ها
    let start, end;
    if (startDate) {
      start = new Date(startDate);
      if (isNaN(start.getTime())) {
        throw new ValidationError('فرمت تاریخ شروع نامعتبر است');
      }
    }

    if (endDate) {
      end = new Date(endDate);
      if (isNaN(end.getTime())) {
        throw new ValidationError('فرمت تاریخ پایان نامعتبر است');
      }
    }

    if (start && end && start >= end) {
      throw new ValidationError('تاریخ شروع باید قبل از تاریخ پایان باشد');
    }

    // اعتبارسنجی وضعیت
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      throw new ValidationError(`وضعیت باید یکی از موارد زیر باشد: ${validStatuses.join(', ')}`);
    }

    const filters = {
      status,
      companyId,
      userId,
      startDate: start,
      endDate: end,
      limit: Math.min(parseInt(limit), 100), // حداکثر ۱۰۰
      offset: parseInt(offset),
      sortBy,
      sortOrder
    };

    const orderData = await managerService.getOrderManagementData(filters);

    res.json({
      success: true,
      message: 'داده‌های مدیریت سفارشات با موفقیت دریافت شد',
      data: orderData
    });
  } catch (error) {
    next(error);
  }
});

// به‌روزرسانی وضعیت سفارش
router.put('/orders/:orderId/status', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      throw new ValidationError('وضعیت جدید الزامی است');
    }

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`وضعیت باید یکی از موارد زیر باشد: ${validStatuses.join(', ')}`);
    }

    // به‌روزرسانی وضعیت سفارش
    const updateResult = await query(`
      UPDATE orders 
      SET status = $1, notes = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [status, notes || null, orderId]);

    if (updateResult.rows.length === 0) {
      throw new NotFoundError('سفارش یافت نشد');
    }

    const updatedOrder = updateResult.rows[0];

    // ثبت لاگ تغییر وضعیت
    await query(`
      INSERT INTO order_status_logs (order_id, old_status, new_status, notes, changed_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [orderId, updatedOrder.status, status, notes || null]);

    res.json({
      success: true,
      message: 'وضعیت سفارش با موفقیت به‌روزرسانی شد',
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        notes: updatedOrder.notes,
        updatedAt: updatedOrder.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// تولید فاکتور شرکت
router.post('/invoices/company/:companyId', async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { year, month } = req.body;

    if (!year || !month) {
      throw new ValidationError('سال و ماه الزامی است');
    }

    const currentYear = new Date().getFullYear();
    if (year < 2020 || year > currentYear + 1) {
      throw new ValidationError(`سال باید بین ۲۰۲۰ تا ${currentYear + 1} باشد`);
    }

    if (month < 1 || month > 12) {
      throw new ValidationError('ماه باید بین ۱ تا ۱۲ باشد');
    }

    const invoice = await managerService.generateCompanyInvoices(companyId, year, month);

    res.status(201).json({
      success: true,
      message: 'فاکتور شرکت با موفقیت تولید شد',
      invoice
    });
  } catch (error) {
    next(error);
  }
});

// دریافت لیست شرکت‌های فعال
router.get('/companies', async (req, res, next) => {
  try {
    const { search, limit = 20, offset = 0 } = req.query;

    let whereClause = "WHERE status = 'approved'";
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += ` AND (name ILIKE $${paramCount} OR registration_number ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const companiesResult = await query(`
      SELECT 
        c.id,
        c.name,
        c.registration_number,
        c.contact_person,
        c.email,
        c.phone,
        COUNT(u.id) as employee_count,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.final_amount), 0) as total_spent
      FROM companies c
      LEFT JOIN users u ON c.id = u.company_id
      LEFT JOIN orders o ON c.id = o.company_id AND o.status NOT IN ('cancelled')
      ${whereClause}
      GROUP BY c.id, c.name, c.registration_number, c.contact_person, c.email, c.phone
      ORDER BY total_spent DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset]);

    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM companies c
      ${whereClause}
    `, params);

    const companies = companiesResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      registrationNumber: row.registration_number,
      contactPerson: row.contact_person,
      email: row.email,
      phone: row.phone,
      employeeCount: parseInt(row.employee_count),
      totalOrders: parseInt(row.total_orders),
      totalSpent: parseFloat(row.total_spent)
    }));

    res.json({
      success: true,
      message: 'لیست شرکت‌ها با موفقیت دریافت شد',
      companies,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < parseInt(countResult.rows[0].total)
      }
    });
  } catch (error) {
    next(error);
  }
});

// دریافت آمار عملکرد کلی
router.get('/performance', async (req, res, next) => {
  try {
    const { period = 'week' } = req.query;

    const now = new Date();
    let startDate;

    switch (period) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
    }

    // آمار کلی عملکرد
    const performanceResult = await query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(DISTINCT user_id) as unique_customers,
        COUNT(DISTINCT company_id) as active_companies,
        SUM(final_amount) as total_revenue,
        AVG(final_amount) as average_order_value,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered_orders,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders,
        (COUNT(*) FILTER (WHERE status = 'delivered') * 100.0 / COUNT(*)) as delivery_rate,
        (COUNT(*) FILTER (WHERE status = 'cancelled') * 100.0 / COUNT(*)) as cancellation_rate
      FROM orders 
      WHERE created_at >= $1 AND created_at <= $2
    `, [startDate, now]);

    // آمار پرفروش‌ترین اقلام
    const topItemsResult = await query(`
      SELECT 
        fi.name,
        fi.category,
        SUM((item->>'quantity')::integer) as total_quantity,
        SUM((item->>'totalPrice')::numeric) as total_revenue
      FROM orders o,
      jsonb_array_elements(o.items) as item
      JOIN food_items fi ON fi.id = (item->>'foodItemId')::uuid
      WHERE o.created_at >= $1 AND o.created_at <= $2
      AND o.status NOT IN ('cancelled')
      GROUP BY fi.id, fi.name, fi.category
      ORDER BY total_quantity DESC
      LIMIT 5
    `, [startDate, now]);

    const performance = performanceResult.rows[0];

    const performanceData = {
      period: {
        type: period,
        startDate,
        endDate: now
      },
      overview: {
        totalOrders: parseInt(performance.total_orders),
        uniqueCustomers: parseInt(performance.unique_customers),
        activeCompanies: parseInt(performance.active_companies),
        totalRevenue: parseFloat(performance.total_revenue),
        averageOrderValue: parseFloat(performance.average_order_value),
        deliveredOrders: parseInt(performance.delivered_orders),
        cancelledOrders: parseInt(performance.cancelled_orders),
        deliveryRate: parseFloat(performance.delivery_rate),
        cancellationRate: parseFloat(performance.cancellation_rate)
      },
      topItems: topItemsResult.rows.map(row => ({
        name: row.name,
        category: row.category,
        totalQuantity: parseInt(row.total_quantity),
        totalRevenue: parseFloat(row.total_revenue)
      })),
      generatedAt: new Date()
    };

    res.json({
      success: true,
      message: 'آمار عملکرد با موفقیت دریافت شد',
      performance: performanceData
    });
  } catch (error) {
    next(error);
  }
});

export default router;