import express from 'express';
import { ReportingService } from '../services/ReportingService.js';
import { SalesReport } from '../models/SalesReport.js';
import { ValidationError, NotFoundError, createLogger } from '@tadbir-khowan/shared';

const router = express.Router();
const logger = createLogger('sales-routes');
const reportingService = new ReportingService();

// تولید گزارش فروش روزانه
router.post('/daily', async (req, res, next) => {
  try {
    const { date } = req.body;

    if (!date) {
      throw new ValidationError('تاریخ الزامی است');
    }

    const reportDate = new Date(date);
    if (isNaN(reportDate.getTime())) {
      throw new ValidationError('فرمت تاریخ نامعتبر است');
    }

    const report = await reportingService.generateSalesReport('daily', { date: reportDate });

    res.status(201).json({
      success: true,
      message: 'گزارش فروش روزانه با موفقیت تولید شد',
      report: report.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// تولید گزارش فروش ماهانه
router.post('/monthly', async (req, res, next) => {
  try {
    const { year, month } = req.body;

    if (!year || !month) {
      throw new ValidationError('سال و ماه الزامی است');
    }

    if (month < 1 || month > 12) {
      throw new ValidationError('ماه باید بین ۱ تا ۱۲ باشد');
    }

    const report = await reportingService.generateSalesReport('monthly', { year, month });

    res.status(201).json({
      success: true,
      message: 'گزارش فروش ماهانه با موفقیت تولید شد',
      report: report.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// تولید گزارش فروش شرکت
router.post('/company/:companyId', async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { startDate, endDate } = req.body;

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

    const report = await reportingService.generateSalesReport('company', {
      companyId,
      startDate: start,
      endDate: end
    });

    res.status(201).json({
      success: true,
      message: 'گزارش فروش شرکت با موفقیت تولید شد',
      report: report.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// تولید گزارش فروش سفارشی
router.post('/custom', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.body;

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

    // محدودیت بازه زمانی (حداکثر ۶ ماه)
    const sixMonthsInMs = 6 * 30 * 24 * 60 * 60 * 1000;
    if (end - start > sixMonthsInMs) {
      throw new ValidationError('بازه زمانی نمی‌تواند بیشتر از ۶ ماه باشد');
    }

    const report = await reportingService.generateSalesReport('custom', {
      startDate: start,
      endDate: end
    });

    res.status(201).json({
      success: true,
      message: 'گزارش فروش سفارشی با موفقیت تولید شد',
      report: report.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// دریافت گزارش فروش بر اساس شناسه
router.get('/:reportId', async (req, res, next) => {
  try {
    const { reportId } = req.params;

    const report = await SalesReport.findById(reportId);
    if (!report) {
      throw new NotFoundError('گزارش یافت نشد');
    }

    res.json({
      success: true,
      report: report.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// دریافت لیست گزارش‌های فروش
router.get('/', async (req, res, next) => {
  try {
    const { startDate, endDate, reportType, limit = 20, offset = 0 } = req.query;

    let reports;
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new ValidationError('فرمت تاریخ نامعتبر است');
      }
      
      reports = await SalesReport.findByDateRange(start, end, reportType);
    } else {
      // اگر تاریخ مشخص نشده، گزارش‌های ماه جاری را نمایش بده
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      reports = await SalesReport.findByDateRange(startOfMonth, endOfMonth, reportType);
    }

    // صفحه‌بندی
    const paginatedReports = reports.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      success: true,
      reports: paginatedReports.map(report => report.toJSON()),
      pagination: {
        total: reports.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < reports.length
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;