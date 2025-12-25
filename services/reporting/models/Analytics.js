import { query } from '../config/database.js';

export class Analytics {
  static async getDashboardMetrics(startDate, endDate) {
    try {
      // آمار کلی
      const overviewResult = await query(`
        SELECT 
          COUNT(DISTINCT o.id) as total_orders,
          COUNT(DISTINCT o.user_id) as unique_customers,
          COUNT(DISTINCT o.company_id) as active_companies,
          COALESCE(SUM(o.final_amount), 0) as total_revenue,
          COALESCE(AVG(o.final_amount), 0) as average_order_value
        FROM orders o
        WHERE o.created_at >= $1 AND o.created_at <= $2
        AND o.status NOT IN ('cancelled')
      `, [startDate, endDate]);

      // مقایسه با دوره قبل
      const previousPeriodStart = new Date(startDate);
      const periodDiff = endDate - startDate;
      previousPeriodStart.setTime(previousPeriodStart.getTime() - periodDiff);

      const previousPeriodResult = await query(`
        SELECT 
          COUNT(DISTINCT o.id) as total_orders,
          COALESCE(SUM(o.final_amount), 0) as total_revenue
        FROM orders o
        WHERE o.created_at >= $1 AND o.created_at < $2
        AND o.status NOT IN ('cancelled')
      `, [previousPeriodStart, startDate]);

      // روند فروش روزانه
      const dailyTrendResult = await query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as order_count,
          SUM(final_amount) as revenue
        FROM orders 
        WHERE created_at >= $1 AND created_at <= $2
        AND status NOT IN ('cancelled')
        GROUP BY DATE(created_at)
        ORDER BY date
      `, [startDate, endDate]);

      // وضعیت سفارشات
      const orderStatusResult = await query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM orders 
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY status
      `, [startDate, endDate]);

      const overview = overviewResult.rows[0];
      const previousPeriod = previousPeriodResult.rows[0];

      // محاسبه درصد تغییر
      const orderGrowth = previousPeriod.total_orders > 0 
        ? ((overview.total_orders - previousPeriod.total_orders) / previousPeriod.total_orders) * 100 
        : 0;

      const revenueGrowth = previousPeriod.total_revenue > 0 
        ? ((overview.total_revenue - previousPeriod.total_revenue) / previousPeriod.total_revenue) * 100 
        : 0;

      return {
        overview: {
          totalOrders: parseInt(overview.total_orders),
          uniqueCustomers: parseInt(overview.unique_customers),
          activeCompanies: parseInt(overview.active_companies),
          totalRevenue: parseFloat(overview.total_revenue),
          averageOrderValue: parseFloat(overview.average_order_value),
          orderGrowth: parseFloat(orderGrowth.toFixed(2)),
          revenueGrowth: parseFloat(revenueGrowth.toFixed(2))
        },
        dailyTrend: dailyTrendResult.rows.map(row => ({
          date: row.date,
          orderCount: parseInt(row.order_count),
          revenue: parseFloat(row.revenue)
        })),
        orderStatus: orderStatusResult.rows.reduce((acc, row) => {
          acc[row.status] = parseInt(row.count);
          return acc;
        }, {})
      };
    } catch (error) {
      throw new Error(`خطا در دریافت متریک‌های داشبورد: ${error.message}`);
    }
  }

  static async getInventoryAnalytics(date = new Date()) {
    try {
      // موجودی اقلام غذایی
      const inventoryResult = await query(`
        SELECT 
          fi.id,
          fi.name,
          fi.category,
          dm.available_quantity,
          dm.sold_quantity,
          (dm.available_quantity - dm.sold_quantity) as remaining_quantity,
          CASE 
            WHEN (dm.available_quantity - dm.sold_quantity) <= 5 THEN 'low'
            WHEN (dm.available_quantity - dm.sold_quantity) <= 20 THEN 'medium'
            ELSE 'high'
          END as stock_level
        FROM food_items fi
        JOIN daily_menu_items dm ON fi.id = dm.food_item_id
        JOIN daily_menus d ON dm.daily_menu_id = d.id
        WHERE d.date = $1
        ORDER BY remaining_quantity ASC
      `, [date]);

      // اقلام کم‌موجود
      const lowStockItems = inventoryResult.rows.filter(item => item.stock_level === 'low');

      // آمار دسته‌بندی
      const categoryStats = inventoryResult.rows.reduce((acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = {
            totalItems: 0,
            lowStockItems: 0,
            totalAvailable: 0,
            totalSold: 0
          };
        }
        
        acc[item.category].totalItems++;
        acc[item.category].totalAvailable += parseInt(item.available_quantity);
        acc[item.category].totalSold += parseInt(item.sold_quantity);
        
        if (item.stock_level === 'low') {
          acc[item.category].lowStockItems++;
        }
        
        return acc;
      }, {});

      return {
        inventory: inventoryResult.rows.map(row => ({
          id: row.id,
          name: row.name,
          category: row.category,
          availableQuantity: parseInt(row.available_quantity),
          soldQuantity: parseInt(row.sold_quantity),
          remainingQuantity: parseInt(row.remaining_quantity),
          stockLevel: row.stock_level
        })),
        lowStockItems: lowStockItems.map(row => ({
          id: row.id,
          name: row.name,
          remainingQuantity: parseInt(row.remaining_quantity)
        })),
        categoryStats
      };
    } catch (error) {
      throw new Error(`خطا در دریافت آنالیتیک موجودی: ${error.message}`);
    }
  }

  static async getCustomerAnalytics(startDate, endDate) {
    try {
      // آمار مشتریان
      const customerStatsResult = await query(`
        SELECT 
          COUNT(DISTINCT user_id) as total_customers,
          COUNT(DISTINCT CASE WHEN company_id IS NOT NULL THEN user_id END) as company_customers,
          COUNT(DISTINCT CASE WHEN company_id IS NULL THEN user_id END) as individual_customers
        FROM orders 
        WHERE created_at >= $1 AND created_at <= $2
        AND status NOT IN ('cancelled')
      `, [startDate, endDate]);

      // مشتریان پرسفارش
      const topCustomersResult = await query(`
        SELECT 
          o.user_id,
          u.first_name,
          u.last_name,
          u.email,
          COUNT(*) as order_count,
          SUM(o.final_amount) as total_spent,
          AVG(o.final_amount) as average_order_value
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.created_at >= $1 AND o.created_at <= $2
        AND o.status NOT IN ('cancelled')
        GROUP BY o.user_id, u.first_name, u.last_name, u.email
        ORDER BY total_spent DESC
        LIMIT 20
      `, [startDate, endDate]);

      // آمار شرکت‌ها
      const companyStatsResult = await query(`
        SELECT 
          o.company_id,
          c.name as company_name,
          COUNT(DISTINCT o.user_id) as employee_count,
          COUNT(*) as total_orders,
          SUM(o.final_amount) as total_spent,
          AVG(o.final_amount) as average_order_value
        FROM orders o
        JOIN companies c ON o.company_id = c.id
        WHERE o.created_at >= $1 AND o.created_at <= $2
        AND o.status NOT IN ('cancelled')
        GROUP BY o.company_id, c.name
        ORDER BY total_spent DESC
      `, [startDate, endDate]);

      const customerStats = customerStatsResult.rows[0];

      return {
        overview: {
          totalCustomers: parseInt(customerStats.total_customers),
          companyCustomers: parseInt(customerStats.company_customers),
          individualCustomers: parseInt(customerStats.individual_customers)
        },
        topCustomers: topCustomersResult.rows.map(row => ({
          userId: row.user_id,
          name: `${row.first_name} ${row.last_name}`,
          email: row.email,
          orderCount: parseInt(row.order_count),
          totalSpent: parseFloat(row.total_spent),
          averageOrderValue: parseFloat(row.average_order_value)
        })),
        companyStats: companyStatsResult.rows.map(row => ({
          companyId: row.company_id,
          companyName: row.company_name,
          employeeCount: parseInt(row.employee_count),
          totalOrders: parseInt(row.total_orders),
          totalSpent: parseFloat(row.total_spent),
          averageOrderValue: parseFloat(row.average_order_value)
        }))
      };
    } catch (error) {
      throw new Error(`خطا در دریافت آنالیتیک مشتریان: ${error.message}`);
    }
  }

  static async getRevenueAnalytics(startDate, endDate, groupBy = 'day') {
    try {
      let dateFormat;
      switch (groupBy) {
        case 'hour':
          dateFormat = "DATE_TRUNC('hour', created_at)";
          break;
        case 'day':
          dateFormat = "DATE_TRUNC('day', created_at)";
          break;
        case 'week':
          dateFormat = "DATE_TRUNC('week', created_at)";
          break;
        case 'month':
          dateFormat = "DATE_TRUNC('month', created_at)";
          break;
        default:
          dateFormat = "DATE_TRUNC('day', created_at)";
      }

      const revenueResult = await query(`
        SELECT 
          ${dateFormat} as period,
          COUNT(*) as order_count,
          SUM(final_amount) as revenue,
          AVG(final_amount) as average_order_value,
          SUM(
            (SELECT SUM(quantity) FROM jsonb_to_recordset(items) AS x(quantity integer))
          ) as total_items
        FROM orders 
        WHERE created_at >= $1 AND created_at <= $2
        AND status NOT IN ('cancelled')
        GROUP BY ${dateFormat}
        ORDER BY period
      `, [startDate, endDate]);

      // محاسبه روند رشد
      const revenueData = revenueResult.rows.map((row, index) => {
        const current = parseFloat(row.revenue);
        const previous = index > 0 ? parseFloat(revenueResult.rows[index - 1].revenue) : current;
        const growth = previous > 0 ? ((current - previous) / previous) * 100 : 0;

        return {
          period: row.period,
          orderCount: parseInt(row.order_count),
          revenue: current,
          averageOrderValue: parseFloat(row.average_order_value),
          totalItems: parseInt(row.total_items),
          growth: parseFloat(growth.toFixed(2))
        };
      });

      return {
        revenueData,
        summary: {
          totalRevenue: revenueData.reduce((sum, item) => sum + item.revenue, 0),
          totalOrders: revenueData.reduce((sum, item) => sum + item.orderCount, 0),
          averageGrowth: revenueData.reduce((sum, item) => sum + item.growth, 0) / revenueData.length
        }
      };
    } catch (error) {
      throw new Error(`خطا در دریافت آنالیتیک درآمد: ${error.message}`);
    }
  }
}