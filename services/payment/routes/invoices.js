import express from 'express';
import { InvoiceService } from '../services/InvoiceService.js';
import { createLogger } from '@tadbir-khowan/shared';

const router = express.Router();
const logger = createLogger('invoice-routes');

// Generate invoice
router.post('/generate', async (req, res, next) => {
  try {
    const invoice = await InvoiceService.generateInvoice(req.body);
    res.json({
      success: true,
      data: invoice,
      message: 'Invoice generated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get invoice by ID
router.get('/:id', async (req, res, next) => {
  try {
    const invoice = await InvoiceService.getInvoiceById(req.params.id);
    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
});

// Get user invoices
router.get('/user/:userId', async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: parseInt(req.query.limit) || 100
    };

    const invoices = await InvoiceService.getUserInvoices(req.params.userId, filters);
    res.json({
      success: true,
      data: invoices
    });
  } catch (error) {
    next(error);
  }
});

// Get company invoices
router.get('/company/:companyId', async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: parseInt(req.query.limit) || 100
    };

    const invoices = await InvoiceService.getCompanyInvoices(req.params.companyId, filters);
    res.json({
      success: true,
      data: invoices
    });
  } catch (error) {
    next(error);
  }
});

// Update invoice status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const invoice = await InvoiceService.updateInvoiceStatus(req.params.id, status);
    res.json({
      success: true,
      data: invoice,
      message: 'Invoice status updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Download invoice PDF
router.get('/:id/download', async (req, res, next) => {
  try {
    const downloadInfo = await InvoiceService.downloadInvoice(req.params.id);
    res.download(downloadInfo.filepath, downloadInfo.filename);
  } catch (error) {
    next(error);
  }
});

// Regenerate invoice PDF
router.post('/:id/regenerate-pdf', async (req, res, next) => {
  try {
    const invoice = await InvoiceService.regenerateInvoicePDF(req.params.id);
    res.json({
      success: true,
      data: invoice,
      message: 'Invoice PDF regenerated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Generate monthly invoices
router.post('/generate-monthly', async (req, res, next) => {
  try {
    const { year, month } = req.body;
    
    if (!year || !month) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Year and month are required'
        }
      });
    }

    const result = await InvoiceService.generateMonthlyInvoices(year, month);
    res.json({
      success: true,
      data: result,
      message: 'Monthly invoices generation completed'
    });
  } catch (error) {
    next(error);
  }
});

export default router;