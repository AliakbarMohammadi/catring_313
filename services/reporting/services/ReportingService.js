import { SalesReport } from '../models/SalesReport.js';
import { Analytics } from '../models/Analytics.js';
import { createLogger } from '@tadbir-khowan/shared';

const logger = createLogger('reporting-service');

export class ReportingService {
  async generateSalesReport(type, options = {}) {
    try {
      logger.info(`تولید گزارش فروش نوع: ${type}`, options);

      let report;
      
      switch (type) {
        case 'daily':
          if (!options.date) {
            throw new Error('تاریخ برای گزارش روزانه الزامی است');
          }
          report = await SalesReport.generateDailySalesReport(options.date);
          break;

        case 'monthly':
          if (!options.year || !options.month) {
            throw new Error('سال و ماه برای گزارش ماهانه الزامی است');
          }
          report = await SalesReport.generateMonthlySalesReport(options.year, options.month);
          break;

        case 'company':
          if (!options.companyId || !options.startDate || !options.endDate) {
            throw new Error('شناسه شرکت، تاریخ شروع و پایان برای گزارش شرکت الزامی است');
          }
          report = await SalesReport.generateCompanySalesReport(
            options.companyId, 
            options.startDate, 
            options.endDate
          );
          break;

        case 'custom':
          if (!options.startDate || !options.endDate) {
            throw new Error('تاریخ شروع و پایان برای گزارش سفارشی الزامی است');
          }
          // برای گزارش سفارشی از روش ماهانه استفاده می‌کنیم
          const startDate = new Date(options.startDate);
          const endDate = new Date(options.endDate);
          report = await SalesReport.generateMonthlySalesReport(
            startDate.getFullYear(), 
            startDate.getMonth() + 1
          );
          // تنظیم تاریخ‌های دقیق
          report.startDate = startDate;
          report.endDate = endDate;
          report.reportType = 'custom';
          break;

        default:
          throw new Error(`نوع گزارش نامعتبر: ${type}`);
      }

      // ذخیره گزارش در پایگاه داده
      if (options.save !== false) {
        await report.save();
      }

      logger.info(`گزارش فروش با موفقیت تولید شد`, { reportId: report.id, type });
      return report;

    } catch (error) {
      logger.error(`خطا در تولید گزارش فروش`, { type, error: error.message });
      throw error;
    }
  }

  async getDashboardAnalytics(startDate, endDate) {
    try {
      logger.info('دریافت آنالیتیک داشبورد', { startDate, endDate });

      const [dashboardMetrics, inventoryAnalytics, customerAnalytics, revenueAnalytics] = await Promise.all([
        Analytics.getDashboardMetrics(startDate, endDate),
        Analytics.getInventoryAnalytics(),
        Analytics.getCustomerAnalytics(startDate, endDate),
        Analytics.getRevenueAnalytics(startDate, endDate, 'day')
      ]);

      const analytics = {
        period: {
          startDate,
          endDate
        },
        dashboard: dashboardMetrics,
        inventory: inventoryAnalytics,
        customers: customerAnalytics,
        revenue: revenueAnalytics,
        generatedAt: new Date()
      };

      logger.info('آنالیتیک داشبورد با موفقیت تولید شد');
      return analytics;

    } catch (error) {
      logger.error('خطا در دریافت آنالیتیک داشبورد', { error: error.message });
      throw error;
    }
  }

  async getInventoryReport(date = new Date()) {
    try {
      logger.info('تولید گزارش موجودی', { date });

      const inventoryData = await Analytics.getInventoryAnalytics(date);
      
      const report = {
        date,
        ...inventoryData,
        alerts: {
          lowStockCount: inventoryData.lowStockItems.length,
          criticalItems: inventoryData.lowStockItems.filter(item => item.remainingQuantity <= 2),
          recommendations: this.generateInventoryRecommendations(inventoryData)
        },
        generatedAt: new Date()
      };

      logger.info('گزارش موجودی با موفقیت تولید شد');
      return report;

    } catch (error) {
      logger.error('خطا در تولید گزارش موجودی', { error: error.message });
      throw error;
    }
  }

  async getCustomerInsights(startDate, endDate) {
    try {
      logger.info('تولید بینش مشتریان', { startDate, endDate });

      const customerData = await Analytics.getCustomerAnalytics(startDate, endDate);
      
      const insights = {
        period: { startDate, endDate },
        ...customerData,
        insights: {
          customerRetention: this.calculateCustomerRetention(customerData),
          loyaltySegments: this.segmentCustomersByLoyalty(customerData.topCustomers),
          companyPerformance: this.analyzeCompanyPerformance(customerData.companyStats)
        },
        generatedAt: new Date()
      };

      logger.info('بینش مشتریان با موفقیت تولید شد');
      return insights;

    } catch (error) {
      logger.error('خطا در تولید بینش مشتریان', { error: error.message });
      throw error;
    }
  }

  async getRevenueAnalysis(startDate, endDate, groupBy = 'day') {
    try {
      logger.info('تحلیل درآمد', { startDate, endDate, groupBy });

      const revenueData = await Analytics.getRevenueAnalytics(startDate, endDate, groupBy);
      
      const analysis = {
        period: { startDate, endDate },
        groupBy,
        ...revenueData,
        trends: {
          growthTrend: this.analyzeGrowthTrend(revenueData.revenueData),
          seasonality: this.detectSeasonality(revenueData.revenueData),
          forecasting: this.generateRevenueForecast(revenueData.revenueData)
        },
        generatedAt: new Date()
      };

      logger.info('تحلیل درآمد با موفقیت تولید شد');
      return analysis;

    } catch (error) {
      logger.error('خطا در تحلیل درآمد', { error: error.message });
      throw error;
    }
  }

  // متدهای کمکی برای تحلیل داده‌ها
  generateInventoryRecommendations(inventoryData) {
    const recommendations = [];

    // پیشنهاد برای اقلام کم‌موجود
    if (inventoryData.lowStockItems.length > 0) {
      recommendations.push({
        type: 'low_stock',
        priority: 'high',
        message: `${inventoryData.lowStockItems.length} قلم غذایی کم‌موجود است`,
        action: 'افزایش موجودی اقلام کم‌موجود'
      });
    }

    // پیشنهاد بر اساس دسته‌بندی
    Object.entries(inventoryData.categoryStats).forEach(([category, stats]) => {
      const lowStockRatio = stats.lowStockItems / stats.totalItems;
      if (lowStockRatio > 0.3) {
        recommendations.push({
          type: 'category_alert',
          priority: 'medium',
          message: `دسته ${category} نیاز به تجدید موجودی دارد`,
          action: `بررسی و تجدید موجودی دسته ${category}`
        });
      }
    });

    return recommendations;
  }

  calculateCustomerRetention(customerData) {
    // محاسبه ساده نرخ حفظ مشتری
    const totalCustomers = customerData.overview.totalCustomers;
    const activeCustomers = customerData.topCustomers.length;
    
    return {
      retentionRate: totalCustomers > 0 ? (activeCustomers / totalCustomers) * 100 : 0,
      totalCustomers,
      activeCustomers
    };
  }

  segmentCustomersByLoyalty(topCustomers) {
    if (!topCustomers || topCustomers.length === 0) return {};

    const segments = {
      vip: [], // بالای ۱۰ سفارش
      loyal: [], // ۵-۱۰ سفارش
      regular: [], // ۲-۴ سفارش
      new: [] // ۱ سفارش
    };

    topCustomers.forEach(customer => {
      if (customer.orderCount >= 10) {
        segments.vip.push(customer);
      } else if (customer.orderCount >= 5) {
        segments.loyal.push(customer);
      } else if (customer.orderCount >= 2) {
        segments.regular.push(customer);
      } else {
        segments.new.push(customer);
      }
    });

    return segments;
  }

  analyzeCompanyPerformance(companyStats) {
    if (!companyStats || companyStats.length === 0) return {};

    const totalRevenue = companyStats.reduce((sum, company) => sum + company.totalSpent, 0);
    
    return {
      topPerformers: companyStats.slice(0, 5),
      totalCompanies: companyStats.length,
      averageSpendPerCompany: totalRevenue / companyStats.length,
      totalRevenue
    };
  }

  analyzeGrowthTrend(revenueData) {
    if (!revenueData || revenueData.length < 2) return null;

    const growthRates = revenueData.slice(1).map(item => item.growth);
    const averageGrowth = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
    
    let trend = 'stable';
    if (averageGrowth > 5) trend = 'growing';
    else if (averageGrowth < -5) trend = 'declining';

    return {
      trend,
      averageGrowthRate: averageGrowth,
      consistency: this.calculateGrowthConsistency(growthRates)
    };
  }

  calculateGrowthConsistency(growthRates) {
    if (growthRates.length === 0) return 0;
    
    const mean = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
    const variance = growthRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / growthRates.length;
    const standardDeviation = Math.sqrt(variance);
    
    // کم‌تر بودن انحراف معیار نشان‌دهنده ثبات بیشتر است
    return Math.max(0, 100 - standardDeviation);
  }

  detectSeasonality(revenueData) {
    // تشخیص ساده الگوهای فصلی
    if (!revenueData || revenueData.length < 7) return null;

    const weeklyPattern = {};
    revenueData.forEach(item => {
      const dayOfWeek = new Date(item.period).getDay();
      if (!weeklyPattern[dayOfWeek]) {
        weeklyPattern[dayOfWeek] = [];
      }
      weeklyPattern[dayOfWeek].push(item.revenue);
    });

    const weeklyAverages = {};
    Object.entries(weeklyPattern).forEach(([day, revenues]) => {
      weeklyAverages[day] = revenues.reduce((sum, rev) => sum + rev, 0) / revenues.length;
    });

    return {
      weeklyPattern: weeklyAverages,
      peakDay: Object.entries(weeklyAverages).reduce((max, [day, avg]) => 
        avg > max.avg ? { day: parseInt(day), avg } : max, { day: 0, avg: 0 }
      )
    };
  }

  generateRevenueForecast(revenueData) {
    // پیش‌بینی ساده بر اساس روند
    if (!revenueData || revenueData.length < 3) return null;

    const recentData = revenueData.slice(-7); // ۷ روز اخیر
    const averageRevenue = recentData.reduce((sum, item) => sum + item.revenue, 0) / recentData.length;
    const averageGrowth = recentData.reduce((sum, item) => sum + item.growth, 0) / recentData.length;

    const nextPeriodForecast = averageRevenue * (1 + averageGrowth / 100);

    return {
      nextPeriodForecast,
      confidence: this.calculateForecastConfidence(recentData),
      basedOnDays: recentData.length
    };
  }

  calculateForecastConfidence(recentData) {
    // محاسبه اعتماد بر اساس ثبات داده‌ها
    const revenues = recentData.map(item => item.revenue);
    const mean = revenues.reduce((sum, rev) => sum + rev, 0) / revenues.length;
    const variance = revenues.reduce((sum, rev) => sum + Math.pow(rev - mean, 2), 0) / revenues.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;

    // کم‌تر بودن ضریب تغییرات نشان‌دهنده اعتماد بیشتر است
    return Math.max(0, Math.min(100, 100 - (coefficientOfVariation * 100)));
  }
}