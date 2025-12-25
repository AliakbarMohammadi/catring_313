import { query } from '../config/database.js';
import { Analytics } from '../models/Analytics.js';
import { SalesReport } from '../models/SalesReport.js';
import { createLogger } from '@tadbir-khowan/shared';

const logger = createLogger('catering-manager-service');

export class CateringManagerService {
  async getDailySalesSummary(date = new Date()) {
    try {
      logger.info('تولید خلاصه فروش روزانه برای مدیر کترینگ', { date });

      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      // آمار کلی روز
      const dailyStatsResult = await query(`
        SELECT 
          COUNT(*) as total_orders,
          COUNT(DISTINCT user_id) as unique_customers,
          COUNT(DISTINCT company_id) as active_companies,
          COALESCE(SUM(final_amount), 0) as total_revenue,
          COALESCE(AVG(final_amount), 0) as average_order_value,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
          COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_orders,
          COUNT(*) FILTER (WHERE status = 'preparing') as preparing_orders,
          COUNT(*) FILTER (WHERE status = 'ready') as ready_orders,
          COUNT(*) FILTER (WHERE status = 'delivered') as delivered_orders,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders
        FROM orders 
        WHERE created_at >= $1 AND created_at <= $2
      `, [startDate, endDate]);

      // آمار ساعتی
      const hourlyStatsResult = await query(`
        SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as order_count,
          SUM(final_amount) as revenue
        FROM orders 
        WHERE created_at >= $1 AND created_at <= $2
        AND status NOT IN ('cancelled')
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `, [startDate, endDate]);

      // پرفروش‌ترین اقلام روز
      const topItemsResult = await query(`
        SELECT 
          fi.id,
          fi.name,
          fi.category,
          SUM((item->>'quantity')::integer) as total_quantity,
          SUM((item->>'totalPrice')::numeric) as total_revenue,
          COUNT(DISTINCT o.id) as order_count
        FROM orders o,
        jsonb_array_elements(o.items) as item
        JOIN food_items fi ON fi.id = (item->>'foodItemId')::uuid
        WHERE o.created_at >= $1 AND o.created_at <= $2
        AND o.status NOT IN ('cancelled')
        GROUP BY fi.id, fi.name, fi.category
        ORDER BY total_quantity DESC
        LIMIT 10
      `, [startDate, endDate]);

      // آمار شرکت‌ها
      const companyStatsResult = await query(`
        SELECT 
          c.id,
          c.name,
          COUNT(o.id) as order_count,
          SUM(o.final_amount) as total_spent,
          COUNT(DISTINCT o.user_id) as active_employees
        FROM orders o
        JOIN companies c ON o.company_id = c.id
        WHERE o.created_at >= $1 AND o.created_at <= $2
        AND o.status NOT IN ('cancelled')
        GROUP BY c.id, c.name
        ORDER BY total_spent DESC
        LIMIT 10
      `, [startDate, endDate]);

      // مقایسه با روز قبل
      const previousDay = new Date(date);
      previousDay.setDate(previousDay.getDate() - 1);
      const previousDayStart = new Date(previousDay);
      previousDayStart.setHours(0, 0, 0, 0);
      const previousDayEnd = new Date(previousDay);
      previousDayEnd.setHours(23, 59, 59, 999);

      const previousDayStatsResult = await query(`
        SELECT 
          COUNT(*) as total_orders,
          COALESCE(SUM(final_amount), 0) as total_revenue
        FROM orders 
        WHERE created_at >= $1 AND created_at <= $2
        AND status NOT IN ('cancelled')
      `, [previousDayStart, previousDayEnd]);

      const dailyStats = dailyStatsResult.rows[0];
      const previousDayStats = previousDayStatsResult.rows[0];

      // محاسبه درصد تغییر
      const orderGrowth = previousDayStats.total_orders > 0 
        ? ((dailyStats.total_orders - previousDayStats.total_orders) / previousDayStats.total_orders) * 100 
        : 0;

      const revenueGrowth = previousDayStats.total_revenue > 0 
        ? ((dailyStats.total_revenue - previousDayStats.total_revenue) / previousDayStats.total_revenue) * 100 
        : 0;

      // تولید آرایه کامل ۲۴ ساعته
      const hourlyData = Array.from({ length: 24 }, (_, hour) => {
        const hourData = hourlyStatsResult.rows.find(row => parseInt(row.hour) === hour);
        return {
          hour,
          orderCount: hourData ? parseInt(hourData.order_count) : 0,
          revenue: hourData ? parseFloat(hourData.revenue) : 0
        };
      });

      const summary = {
        date,
        overview: {
          totalOrders: parseInt(dailyStats.total_orders),
          uniqueCustomers: parseInt(dailyStats.unique_customers),
          activeCompanies: parseInt(dailyStats.active_companies),
          totalRevenue: parseFloat(dailyStats.total_revenue),
          averageOrderValue: parseFloat(dailyStats.average_order_value),
          orderGrowth: parseFloat(orderGrowth.toFixed(2)),
          revenueGrowth: parseFloat(revenueGrowth.toFixed(2))
        },
        orderStatus: {
          pending: parseInt(dailyStats.pending_orders),
          confirmed: parseInt(dailyStats.confirmed_orders),
          preparing: parseInt(dailyStats.preparing_orders),
          ready: parseInt(dailyStats.ready_orders),
          delivered: parseInt(dailyStats.delivered_orders),
          cancelled: parseInt(dailyStats.cancelled_orders)
        },
        hourlyTrend: hourlyData,
        topSellingItems: topItemsResult.rows.map(row => ({
          id: row.id,
          name: row.name,
          category: row.category,
          totalQuantity: parseInt(row.total_quantity),
          totalRevenue: parseFloat(row.total_revenue),
          orderCount: parseInt(row.order_count)
        })),
        topCompanies: companyStatsResult.rows.map(row => ({
          id: row.id,
          name: row.name,
          orderCount: parseInt(row.order_count),
          totalSpent: parseFloat(row.total_spent),
          activeEmployees: parseInt(row.active_employees)
        })),
        generatedAt: new Date()
      };

      logger.info('خلاصه فروش روزانه با موفقیت تولید شد');
      return summary;

    } catch (error) {
      logger.error('خطا در تولید خلاصه فروش روزانه', { error: error.message });
      throw error;
    }
  }

  async getOrderManagementData(filters = {}) {
    try {
      logger.info('دریافت داده‌های مدیریت سفارشات', { filters });

      const {
        status,
        companyId,
        userId,
        startDate,
        endDate,
        limit = 50,
        offset = 0,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = filters;

      // ساخت کوئری پویا
      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        whereClause += ` AND o.status = $${paramCount}`;
        params.push(status);
      }

      if (companyId) {
        paramCount++;
        whereClause += ` AND o.company_id = $${paramCount}`;
        params.push(companyId);
      }

      if (userId) {
        paramCount++;
        whereClause += ` AND o.user_id = $${paramCount}`;
        params.push(userId);
      }

      if (startDate) {
        paramCount++;
        whereClause += ` AND o.created_at >= $${paramCount}`;
        params.push(startDate);
      }

      if (endDate) {
        paramCount++;
        whereClause += ` AND o.created_at <= $${paramCount}`;
        params.push(endDate);
      }

      // اعتبارسنجی فیلدهای مرتب‌سازی
      const validSortFields = ['created_at', 'final_amount', 'status', 'delivery_date'];
      const validSortOrders = ['ASC', 'DESC'];
      
      const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
      const safeSortOrder = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

      // دریافت سفارشات
      const ordersResult = await query(`
        SELECT 
          o.id,
          o.user_id,
          o.company_id,
          o.order_date,
          o.delivery_date,
          o.items,
          o.total_amount,
          o.discount_amount,
          o.final_amount,
          o.status,
          o.payment_status,
          o.notes,
          o.created_at,
          o.updated_at,
          u.first_name,
          u.last_name,
          u.email,
          c.name as company_name
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN companies c ON o.company_id = c.id
        ${whereClause}
        ORDER BY o.${safeSortBy} ${safeSortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `, [...params, limit, offset]);

      // شمارش کل سفارشات
      const countResult = await query(`
        SELECT COUNT(*) as total
        FROM orders o
        ${whereClause}
      `, params);

      // آمار وضعیت سفارشات
      const statusStatsResult = await query(`
        SELECT 
          status,
          COUNT(*) as count,
          SUM(final_amount) as total_amount
        FROM orders o
        ${whereClause}
        GROUP BY status
      `, params);

      const orders = ordersResult.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        companyId: row.company_id,
        orderDate: row.order_date,
        deliveryDate: row.delivery_date,
        items: row.items,
        totalAmount: parseFloat(row.total_amount),
        discountAmount: parseFloat(row.discount_amount),
        finalAmount: parseFloat(row.final_amount),
        status: row.status,
        paymentStatus: row.payment_status,
        notes: row.notes,
        customer: {
          name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
          email: row.email
        },
        companyName: row.company_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      const statusStats = statusStatsResult.rows.reduce((acc, row) => {
        acc[row.status] = {
          count: parseInt(row.count),
          totalAmount: parseFloat(row.total_amount)
        };
        return acc;
      }, {});

      const managementData = {
        orders,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < parseInt(countResult.rows[0].total)
        },
        statusStats,
        filters: {
          status,
          companyId,
          userId,
          startDate,
          endDate,
          sortBy: safeSortBy,
          sortOrder: safeSortOrder
        },
        generatedAt: new Date()
      };

      logger.info('داده‌های مدیریت سفارشات با موفقیت دریافت شد');
      return managementData;

    } catch (error) {
      logger.error('خطا در دریافت داده‌های مدیریت سفارشات', { error: error.message });
      throw error;
    }
  }

  async generateCompanyInvoices(companyId, year, month) {
    try {
      logger.info('تولید فاکتور شرکت', { companyId, year, month });

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      // اطلاعات شرکت
      const companyResult = await query(`
        SELECT id, name, registration_number, address, contact_person, email, phone
        FROM companies 
        WHERE id = $1
      `, [companyId]);

      if (companyResult.rows.length === 0) {
        throw new Error('شرکت یافت نشد');
      }

      const company = companyResult.rows[0];

      // سفارشات شرکت در ماه مورد نظر
      const ordersResult = await query(`
        SELECT 
          o.id,
          o.user_id,
          o.order_date,
          o.delivery_date,
          o.items,
          o.total_amount,
          o.discount_amount,
          o.final_amount,
          o.status,
          u.first_name,
          u.last_name,
          u.email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.company_id = $1 
        AND o.created_at >= $2 AND o.created_at <= $3
        AND o.status NOT IN ('cancelled')
        ORDER BY o.created_at
      `, [companyId, startDate, endDate]);

      if (ordersResult.rows.length === 0) {
        throw new Error('هیچ سفارشی در این ماه یافت نشد');
      }

      // محاسبه آمار کلی
      const totalOrders = ordersResult.rows.length;
      const totalAmount = ordersResult.rows.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
      const totalDiscount = ordersResult.rows.reduce((sum, order) => sum + parseFloat(order.discount_amount), 0);
      const finalAmount = ordersResult.rows.reduce((sum, order) => sum + parseFloat(order.final_amount), 0);

      // محاسبه مالیات (۹٪)
      const taxRate = 0.09;
      const taxAmount = finalAmount * taxRate;
      const totalWithTax = finalAmount + taxAmount;

      // تجمیع سفارشات بر اساس کاربر
      const employeeOrders = ordersResult.rows.reduce((acc, order) => {
        const employeeKey = order.user_id;
        if (!acc[employeeKey]) {
          acc[employeeKey] = {
            userId: order.user_id,
            name: `${order.first_name} ${order.last_name}`,
            email: order.email,
            orders: [],
            totalAmount: 0,
            totalDiscount: 0,
            finalAmount: 0
          };
        }

        acc[employeeKey].orders.push({
          id: order.id,
          orderDate: order.order_date,
          deliveryDate: order.delivery_date,
          items: order.items,
          totalAmount: parseFloat(order.total_amount),
          discountAmount: parseFloat(order.discount_amount),
          finalAmount: parseFloat(order.final_amount),
          status: order.status
        });

        acc[employeeKey].totalAmount += parseFloat(order.total_amount);
        acc[employeeKey].totalDiscount += parseFloat(order.discount_amount);
        acc[employeeKey].finalAmount += parseFloat(order.final_amount);

        return acc;
      }, {});

      // تجمیع اقلام غذایی
      const itemsSummary = {};
      ordersResult.rows.forEach(order => {
        order.items.forEach(item => {
          const itemId = item.foodItemId;
          if (!itemsSummary[itemId]) {
            itemsSummary[itemId] = {
              foodItemId: itemId,
              quantity: 0,
              totalPrice: 0
            };
          }
          itemsSummary[itemId].quantity += item.quantity;
          itemsSummary[itemId].totalPrice += item.totalPrice;
        });
      });

      const invoice = {
        invoiceNumber: `INV-${companyId.slice(-8)}-${year}${month.toString().padStart(2, '0')}`,
        company: {
          id: company.id,
          name: company.name,
          registrationNumber: company.registration_number,
          address: company.address,
          contactPerson: company.contact_person,
          email: company.email,
          phone: company.phone
        },
        period: {
          year,
          month,
          startDate,
          endDate,
          monthName: new Intl.DateTimeFormat('fa-IR', { month: 'long' }).format(startDate)
        },
        summary: {
          totalOrders,
          totalEmployees: Object.keys(employeeOrders).length,
          totalAmount,
          totalDiscount,
          subtotal: finalAmount,
          taxRate,
          taxAmount,
          totalWithTax
        },
        employeeOrders: Object.values(employeeOrders),
        itemsSummary: Object.values(itemsSummary),
        orders: ordersResult.rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          employeeName: `${row.first_name} ${row.last_name}`,
          orderDate: row.order_date,
          deliveryDate: row.delivery_date,
          items: row.items,
          totalAmount: parseFloat(row.total_amount),
          discountAmount: parseFloat(row.discount_amount),
          finalAmount: parseFloat(row.final_amount),
          status: row.status
        })),
        generatedAt: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // ۳۰ روز از امروز
      };

      logger.info('فاکتور شرکت با موفقیت تولید شد', { 
        companyId, 
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: totalWithTax 
      });

      return invoice;

    } catch (error) {
      logger.error('خطا در تولید فاکتور شرکت', { companyId, year, month, error: error.message });
      throw error;
    }
  }

  async getManagerDashboard() {
    try {
      logger.info('دریافت داشبورد مدیر کترینگ');

      const now = new Date();
      
      // آمار امروز
      const today = await this.getDailySalesSummary(now);

      // آمار این هفته
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      const weekAnalytics = await Analytics.getDashboardMetrics(weekStart, now);

      // آمار این ماه
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthAnalytics = await Analytics.getDashboardMetrics(monthStart, now);

      // آمار موجودی
      const inventoryAnalytics = await Analytics.getInventoryAnalytics(now);

      // سفارشات اخیر
      const recentOrders = await this.getOrderManagementData({
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'DESC'
      });

      // شرکت‌های فعال
      const activeCompaniesResult = await query(`
        SELECT 
          c.id,
          c.name,
          COUNT(o.id) as recent_orders,
          SUM(o.final_amount) as recent_revenue
        FROM companies c
        LEFT JOIN orders o ON c.id = o.company_id 
          AND o.created_at >= $1 
          AND o.status NOT IN ('cancelled')
        WHERE c.status = 'approved'
        GROUP BY c.id, c.name
        HAVING COUNT(o.id) > 0
        ORDER BY recent_revenue DESC
        LIMIT 10
      `, [weekStart]);

      const dashboard = {
        overview: {
          today: today.overview,
          week: weekAnalytics.overview,
          month: monthAnalytics.overview
        },
        todayDetails: {
          orderStatus: today.orderStatus,
          hourlyTrend: today.hourlyTrend,
          topSellingItems: today.topSellingItems.slice(0, 5),
          topCompanies: today.topCompanies.slice(0, 5)
        },
        inventory: {
          lowStockItems: inventoryAnalytics.lowStockItems.length,
          criticalItems: inventoryAnalytics.lowStockItems.filter(item => item.remainingQuantity <= 2).length,
          categoryStats: inventoryAnalytics.categoryStats
        },
        recentActivity: {
          orders: recentOrders.orders.slice(0, 5),
          activeCompanies: activeCompaniesResult.rows.map(row => ({
            id: row.id,
            name: row.name,
            recentOrders: parseInt(row.recent_orders),
            recentRevenue: parseFloat(row.recent_revenue)
          }))
        },
        alerts: this.generateManagerAlerts(today, inventoryAnalytics, weekAnalytics),
        generatedAt: new Date()
      };

      logger.info('داشبورد مدیر کترینگ با موفقیت تولید شد');
      return dashboard;

    } catch (error) {
      logger.error('خطا در دریافت داشبورد مدیر کترینگ', { error: error.message });
      throw error;
    }
  }

  generateManagerAlerts(todayStats, inventoryStats, weekStats) {
    const alerts = [];

    // هشدار کاهش فروش
    if (todayStats.overview.orderGrowth < -20) {
      alerts.push({
        type: 'warning',
        priority: 'high',
        title: 'کاهش قابل توجه سفارشات',
        message: `سفارشات امروز ${Math.abs(todayStats.overview.orderGrowth).toFixed(1)}٪ نسبت به دیروز کاهش یافته`,
        action: 'بررسی علت کاهش سفارشات و اقدام مناسب'
      });
    }

    // هشدار موجودی کم
    if (inventoryStats.lowStockItems.length > 0) {
      alerts.push({
        type: 'warning',
        priority: 'medium',
        title: 'موجودی کم',
        message: `${inventoryStats.lowStockItems.length} قلم غذایی کم‌موجود است`,
        action: 'تجدید موجودی اقلام کم‌موجود'
      });
    }

    // هشدار موجودی بحرانی
    const criticalItems = inventoryStats.lowStockItems.filter(item => item.remainingQuantity <= 2);
    if (criticalItems.length > 0) {
      alerts.push({
        type: 'error',
        priority: 'critical',
        title: 'موجودی بحرانی',
        message: `${criticalItems.length} قلم غذایی در وضعیت بحرانی است`,
        action: 'فوری: تأمین موجودی اقلام بحرانی'
      });
    }

    // هشدار رشد مثبت
    if (todayStats.overview.revenueGrowth > 15) {
      alerts.push({
        type: 'success',
        priority: 'info',
        title: 'رشد درآمد',
        message: `درآمد امروز ${todayStats.overview.revenueGrowth.toFixed(1)}٪ نسبت به دیروز افزایش یافته`,
        action: 'ادامه استراتژی موفق فعلی'
      });
    }

    return alerts;
  }
}