import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export class SalesReport {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.reportType = data.reportType; // 'daily', 'weekly', 'monthly', 'yearly'
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.totalOrders = data.totalOrders || 0;
    this.totalRevenue = data.totalRevenue || 0;
    this.totalItems = data.totalItems || 0;
    this.averageOrderValue = data.averageOrderValue || 0;
    this.topSellingItems = data.topSellingItems || [];
    this.salesByCategory = data.salesByCategory || {};
    this.salesByCompany = data.salesByCompany || {};
    this.dailyBreakdown = data.dailyBreakdown || [];
    this.generatedAt = data.generatedAt || new Date();
    this.createdAt = data.createdAt || new Date();
  }

  static async generateDailySalesReport(date) {
    try {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      // کل سفارشات و درآمد روزانه
      const totalStatsResult = await query(`
        SELECT 
          COUNT(*) as total_orders,
          COALESCE(SUM(final_amount), 0) as total_revenue,
          COALESCE(SUM(
            (SELECT SUM(quantity) FROM jsonb_to_recordset(items) AS x(quantity integer))
          ), 0) as total_items,
          COALESCE(AVG(final_amount), 0) as average_order_value
        FROM orders 
        WHERE created_at >= $1 AND created_at <= $2 
        AND status NOT IN ('cancelled')
      `, [startDate, endDate]);

      const stats = totalStatsResult.rows[0];

      // پرفروش‌ترین اقلام
      const topItemsResult = await query(`
        SELECT 
          food_item_id,
          SUM((item->>'quantity')::integer) as total_quantity,
          SUM((item->>'totalPrice')::numeric) as total_revenue
        FROM orders o,
        jsonb_array_elements(o.items) as item
        WHERE o.created_at >= $1 AND o.created_at <= $2
        AND o.status NOT IN ('cancelled')
        GROUP BY food_item_id
        ORDER BY total_quantity DESC
        LIMIT 10
      `, [startDate, endDate]);

      // فروش بر اساس شرکت
      const companySalesResult = await query(`
        SELECT 
          o.company_id,
          c.name as company_name,
          COUNT(*) as order_count,
          SUM(o.final_amount) as total_revenue
        FROM orders o
        LEFT JOIN companies c ON o.company_id = c.id
        WHERE o.created_at >= $1 AND o.created_at <= $2
        AND o.status NOT IN ('cancelled')
        GROUP BY o.company_id, c.name
        ORDER BY total_revenue DESC
      `, [startDate, endDate]);

      const reportData = {
        reportType: 'daily',
        startDate,
        endDate,
        totalOrders: parseInt(stats.total_orders),
        totalRevenue: parseFloat(stats.total_revenue),
        totalItems: parseInt(stats.total_items),
        averageOrderValue: parseFloat(stats.average_order_value),
        topSellingItems: topItemsResult.rows,
        salesByCompany: companySalesResult.rows.reduce((acc, row) => {
          acc[row.company_id || 'individual'] = {
            name: row.company_name || 'کاربران انفرادی',
            orderCount: parseInt(row.order_count),
            totalRevenue: parseFloat(row.total_revenue)
          };
          return acc;
        }, {})
      };

      return new SalesReport(reportData);
    } catch (error) {
      throw new Error(`خطا در تولید گزارش فروش روزانه: ${error.message}`);
    }
  }

  static async generateMonthlySalesReport(year, month) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      // آمار کلی ماهانه
      const totalStatsResult = await query(`
        SELECT 
          COUNT(*) as total_orders,
          COALESCE(SUM(final_amount), 0) as total_revenue,
          COALESCE(SUM(
            (SELECT SUM(quantity) FROM jsonb_to_recordset(items) AS x(quantity integer))
          ), 0) as total_items,
          COALESCE(AVG(final_amount), 0) as average_order_value
        FROM orders 
        WHERE created_at >= $1 AND created_at <= $2 
        AND status NOT IN ('cancelled')
      `, [startDate, endDate]);

      const stats = totalStatsResult.rows[0];

      // تفکیک روزانه در ماه
      const dailyBreakdownResult = await query(`
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

      // پرفروش‌ترین اقلام ماه
      const topItemsResult = await query(`
        SELECT 
          food_item_id,
          SUM((item->>'quantity')::integer) as total_quantity,
          SUM((item->>'totalPrice')::numeric) as total_revenue
        FROM orders o,
        jsonb_array_elements(o.items) as item
        WHERE o.created_at >= $1 AND o.created_at <= $2
        AND o.status NOT IN ('cancelled')
        GROUP BY food_item_id
        ORDER BY total_quantity DESC
        LIMIT 20
      `, [startDate, endDate]);

      const reportData = {
        reportType: 'monthly',
        startDate,
        endDate,
        totalOrders: parseInt(stats.total_orders),
        totalRevenue: parseFloat(stats.total_revenue),
        totalItems: parseInt(stats.total_items),
        averageOrderValue: parseFloat(stats.average_order_value),
        topSellingItems: topItemsResult.rows,
        dailyBreakdown: dailyBreakdownResult.rows.map(row => ({
          date: row.date,
          orderCount: parseInt(row.order_count),
          revenue: parseFloat(row.revenue)
        }))
      };

      return new SalesReport(reportData);
    } catch (error) {
      throw new Error(`خطا در تولید گزارش فروش ماهانه: ${error.message}`);
    }
  }

  static async generateCompanySalesReport(companyId, startDate, endDate) {
    try {
      // آمار کلی شرکت
      const totalStatsResult = await query(`
        SELECT 
          COUNT(*) as total_orders,
          COALESCE(SUM(final_amount), 0) as total_revenue,
          COALESCE(SUM(
            (SELECT SUM(quantity) FROM jsonb_to_recordset(items) AS x(quantity integer))
          ), 0) as total_items,
          COALESCE(AVG(final_amount), 0) as average_order_value
        FROM orders 
        WHERE company_id = $1 
        AND created_at >= $2 AND created_at <= $3 
        AND status NOT IN ('cancelled')
      `, [companyId, startDate, endDate]);

      const stats = totalStatsResult.rows[0];

      // سفارشات کارمندان
      const employeeOrdersResult = await query(`
        SELECT 
          o.user_id,
          u.first_name,
          u.last_name,
          COUNT(*) as order_count,
          SUM(o.final_amount) as total_spent
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.company_id = $1 
        AND o.created_at >= $2 AND o.created_at <= $3
        AND o.status NOT IN ('cancelled')
        GROUP BY o.user_id, u.first_name, u.last_name
        ORDER BY total_spent DESC
      `, [companyId, startDate, endDate]);

      const reportData = {
        reportType: 'company',
        startDate,
        endDate,
        companyId,
        totalOrders: parseInt(stats.total_orders),
        totalRevenue: parseFloat(stats.total_revenue),
        totalItems: parseInt(stats.total_items),
        averageOrderValue: parseFloat(stats.average_order_value),
        employeeOrders: employeeOrdersResult.rows.map(row => ({
          userId: row.user_id,
          name: `${row.first_name} ${row.last_name}`,
          orderCount: parseInt(row.order_count),
          totalSpent: parseFloat(row.total_spent)
        }))
      };

      return new SalesReport(reportData);
    } catch (error) {
      throw new Error(`خطا در تولید گزارش فروش شرکت: ${error.message}`);
    }
  }

  async save() {
    try {
      const result = await query(
        `INSERT INTO sales_reports (
          id, report_type, start_date, end_date, total_orders, total_revenue, 
          total_items, average_order_value, top_selling_items, sales_by_category,
          sales_by_company, daily_breakdown, generated_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          this.id, this.reportType, this.startDate, this.endDate, this.totalOrders,
          this.totalRevenue, this.totalItems, this.averageOrderValue,
          JSON.stringify(this.topSellingItems), JSON.stringify(this.salesByCategory),
          JSON.stringify(this.salesByCompany), JSON.stringify(this.dailyBreakdown),
          this.generatedAt, this.createdAt
        ]
      );

      return new SalesReport(result.rows[0]);
    } catch (error) {
      throw new Error(`خطا در ذخیره گزارش فروش: ${error.message}`);
    }
  }

  static async findById(id) {
    const result = await query('SELECT * FROM sales_reports WHERE id = $1', [id]);
    return result.rows.length > 0 ? new SalesReport(result.rows[0]) : null;
  }

  static async findByDateRange(startDate, endDate, reportType = null) {
    let queryText = 'SELECT * FROM sales_reports WHERE start_date >= $1 AND end_date <= $2';
    const params = [startDate, endDate];

    if (reportType) {
      queryText += ' AND report_type = $3';
      params.push(reportType);
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, params);
    return result.rows.map(row => new SalesReport(row));
  }

  toJSON() {
    return {
      id: this.id,
      reportType: this.reportType,
      startDate: this.startDate,
      endDate: this.endDate,
      totalOrders: this.totalOrders,
      totalRevenue: this.totalRevenue,
      totalItems: this.totalItems,
      averageOrderValue: this.averageOrderValue,
      topSellingItems: this.topSellingItems,
      salesByCategory: this.salesByCategory,
      salesByCompany: this.salesByCompany,
      dailyBreakdown: this.dailyBreakdown,
      generatedAt: this.generatedAt,
      createdAt: this.createdAt
    };
  }
}