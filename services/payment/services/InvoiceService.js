import { Invoice } from '../models/Invoice.js';
import { FinancialRecord } from '../models/FinancialRecord.js';
import { createLogger, ValidationError, NotFoundError, BusinessLogicError } from '@tadbir-khowan/shared';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const logger = createLogger('invoice-service');

export class InvoiceService {
  static async generateInvoice(invoiceData) {
    try {
      // Validate required fields
      if (!invoiceData.userId || !invoiceData.period?.from || !invoiceData.period?.to) {
        throw new ValidationError('User ID and period (from/to dates) are required');
      }

      // Validate period
      const fromDate = new Date(invoiceData.period.from);
      const toDate = new Date(invoiceData.period.to);
      
      if (fromDate >= toDate) {
        throw new ValidationError('Period "from" date must be before "to" date');
      }

      // Check if invoice already exists for this period
      const existingInvoices = await Invoice.findByPeriod(
        invoiceData.userId,
        invoiceData.companyId,
        invoiceData.period.from,
        invoiceData.period.to
      );

      if (existingInvoices.length > 0) {
        throw new BusinessLogicError('Invoice already exists for this period');
      }

      // Get orders for the period
      const orders = await this.getOrdersForPeriod(
        invoiceData.userId,
        invoiceData.companyId,
        invoiceData.period.from,
        invoiceData.period.to
      );

      if (!orders || orders.length === 0) {
        throw new BusinessLogicError('No orders found for the specified period');
      }

      // Calculate invoice totals
      const calculations = this.calculateInvoiceTotals(orders, invoiceData);

      // Create invoice record
      const invoice = await Invoice.create({
        userId: invoiceData.userId,
        companyId: invoiceData.companyId,
        period: invoiceData.period,
        orders: orders.map(order => order.id),
        subtotal: calculations.subtotal,
        tax: calculations.tax,
        discount: calculations.discount,
        total: calculations.total,
        status: 'draft'
      });

      // Generate PDF
      const pdfUrl = await this.generateInvoicePDF(invoice, orders, invoiceData);
      
      // Update invoice with PDF URL
      const updatedInvoice = await Invoice.updatePdfUrl(invoice.id, pdfUrl);

      // Create financial record
      await FinancialRecord.create({
        transactionType: 'invoice_generation',
        referenceId: invoice.id,
        userId: invoiceData.userId,
        companyId: invoiceData.companyId,
        amount: calculations.total,
        description: `Invoice generated for period ${invoiceData.period.from} to ${invoiceData.period.to}`,
        metadata: {
          invoiceId: invoice.id,
          orderCount: orders.length,
          period: invoiceData.period
        }
      });

      logger.info(`Invoice generated: ${invoice.id} for user: ${invoiceData.userId}`);
      return updatedInvoice;
    } catch (error) {
      logger.error('Error generating invoice:', error);
      throw error;
    }
  }

  static calculateInvoiceTotals(orders, invoiceData) {
    // Calculate subtotal from all orders
    const subtotal = orders.reduce((sum, order) => sum + order.finalAmount, 0);

    // Calculate tax (use provided rate or default 9% VAT in Iran)
    const taxRate = invoiceData.taxRate !== undefined ? invoiceData.taxRate : 0.09;
    const tax = subtotal * taxRate;

    // Apply discount if provided
    const discount = invoiceData.discount || 0;

    // Calculate total
    const total = subtotal + tax - discount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }

  static async getOrdersForPeriod(userId, companyId, fromDate, toDate) {
    try {
      const orderServiceUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3004';
      let url = `${orderServiceUrl}/orders`;
      
      const params = new URLSearchParams({
        startDate: fromDate,
        endDate: toDate,
        status: 'delivered' // Only include delivered orders in invoices
      });

      if (companyId) {
        url += `/company/${companyId}`;
      } else {
        url += `/user/${userId}`;
      }

      url += `?${params.toString()}`;

      const response = await axios.get(url);
      
      if (response.data.success) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      logger.error('Error fetching orders for invoice:', error);
      throw new ValidationError('Unable to fetch orders for invoice generation');
    }
  }

  static async generateInvoicePDF(invoice, orders, invoiceData) {
    try {
      // Create invoices directory if it doesn't exist
      const invoicesDir = path.join(process.cwd(), 'storage', 'invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      const filename = `invoice_${invoice.id}_${Date.now()}.pdf`;
      const filepath = path.join(invoicesDir, filename);

      // Create PDF document
      const doc = new PDFDocument({ margin: 50 });
      doc.pipe(fs.createWriteStream(filepath));

      // Add header
      doc.fontSize(20).text('تدبیرخوان - فاکتور', 50, 50, { align: 'right' });
      doc.fontSize(16).text('Tadbir Khowan - Invoice', 50, 80, { align: 'left' });

      // Add invoice details
      doc.fontSize(12);
      doc.text(`Invoice ID: ${invoice.id}`, 50, 120);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 50, 140);
      doc.text(`Period: ${invoice.period.from} to ${invoice.period.to}`, 50, 160);

      // Add customer information (would fetch from user service in real implementation)
      doc.text('Bill To:', 50, 200);
      doc.text(`User ID: ${invoice.userId}`, 50, 220);
      if (invoice.companyId) {
        doc.text(`Company ID: ${invoice.companyId}`, 50, 240);
      }

      // Add table header
      const tableTop = 280;
      doc.text('Order ID', 50, tableTop);
      doc.text('Date', 150, tableTop);
      doc.text('Items', 250, tableTop);
      doc.text('Amount', 450, tableTop, { align: 'right' });

      // Add line under header
      doc.moveTo(50, tableTop + 20).lineTo(550, tableTop + 20).stroke();

      // Add order details
      let yPosition = tableTop + 40;
      orders.forEach((order, index) => {
        doc.text(order.id.substring(0, 8), 50, yPosition);
        doc.text(new Date(order.deliveryDate).toLocaleDateString(), 150, yPosition);
        doc.text(`${order.items.length} items`, 250, yPosition);
        doc.text(`${order.finalAmount.toLocaleString()} IRR`, 450, yPosition, { align: 'right' });
        yPosition += 25;
      });

      // Add totals
      const totalsTop = yPosition + 30;
      doc.moveTo(350, totalsTop).lineTo(550, totalsTop).stroke();
      
      doc.text('Subtotal:', 350, totalsTop + 20);
      doc.text(`${invoice.subtotal.toLocaleString()} IRR`, 450, totalsTop + 20, { align: 'right' });
      
      doc.text('Tax:', 350, totalsTop + 40);
      doc.text(`${invoice.tax.toLocaleString()} IRR`, 450, totalsTop + 40, { align: 'right' });
      
      if (invoice.discount > 0) {
        doc.text('Discount:', 350, totalsTop + 60);
        doc.text(`-${invoice.discount.toLocaleString()} IRR`, 450, totalsTop + 60, { align: 'right' });
      }

      // Add final total
      doc.fontSize(14).font('Helvetica-Bold');
      const totalLine = invoice.discount > 0 ? totalsTop + 80 : totalsTop + 60;
      doc.moveTo(350, totalLine).lineTo(550, totalLine).stroke();
      doc.text('Total:', 350, totalLine + 20);
      doc.text(`${invoice.total.toLocaleString()} IRR`, 450, totalLine + 20, { align: 'right' });

      // Add footer
      doc.fontSize(10).font('Helvetica');
      doc.text('Thank you for your business!', 50, doc.page.height - 100);
      doc.text('تشکر از همکاری شما', 50, doc.page.height - 80, { align: 'right' });

      // Finalize PDF
      doc.end();

      // Return relative URL for storage
      return `/storage/invoices/${filename}`;
    } catch (error) {
      logger.error('Error generating PDF:', error);
      throw new ValidationError('Failed to generate invoice PDF');
    }
  }

  static async getInvoiceById(id) {
    try {
      const invoice = await Invoice.findById(id);
      if (!invoice) {
        throw new NotFoundError('Invoice not found');
      }
      return invoice;
    } catch (error) {
      logger.error('Error getting invoice by id:', error);
      throw error;
    }
  }

  static async getUserInvoices(userId, filters = {}) {
    try {
      const invoices = await Invoice.findByUserId(userId, filters);
      return invoices;
    } catch (error) {
      logger.error('Error getting user invoices:', error);
      throw error;
    }
  }

  static async getCompanyInvoices(companyId, filters = {}) {
    try {
      const invoices = await Invoice.findByCompanyId(companyId, filters);
      return invoices;
    } catch (error) {
      logger.error('Error getting company invoices:', error);
      throw error;
    }
  }

  static async updateInvoiceStatus(id, status) {
    try {
      const validStatuses = ['draft', 'sent', 'paid'];
      if (!validStatuses.includes(status)) {
        throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      const invoice = await Invoice.findById(id);
      if (!invoice) {
        throw new NotFoundError('Invoice not found');
      }

      const updatedInvoice = await Invoice.updateStatus(id, status);

      // Create financial record for status change
      if (status === 'paid') {
        await FinancialRecord.create({
          transactionType: 'invoice_payment',
          referenceId: id,
          userId: invoice.userId,
          companyId: invoice.companyId,
          amount: invoice.total,
          description: `Invoice ${id} marked as paid`,
          metadata: {
            invoiceId: id,
            previousStatus: invoice.status,
            newStatus: status
          }
        });
      }

      logger.info(`Invoice status updated: ${id} from ${invoice.status} to ${status}`);
      return updatedInvoice;
    } catch (error) {
      logger.error('Error updating invoice status:', error);
      throw error;
    }
  }

  static async generateMonthlyInvoices(year, month) {
    try {
      // Calculate period dates
      const fromDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const toDate = new Date(year, month, 0).toISOString().split('T')[0];

      // Get all users/companies with orders in this period
      const entities = await this.getEntitiesWithOrders(fromDate, toDate);

      const generatedInvoices = [];
      const errors = [];

      for (const entity of entities) {
        try {
          const invoice = await this.generateInvoice({
            userId: entity.userId,
            companyId: entity.companyId,
            period: { from: fromDate, to: toDate }
          });
          generatedInvoices.push(invoice);
        } catch (error) {
          logger.error(`Error generating invoice for entity ${entity.userId}:`, error);
          errors.push({
            userId: entity.userId,
            companyId: entity.companyId,
            error: error.message
          });
        }
      }

      logger.info(`Monthly invoices generated: ${generatedInvoices.length} successful, ${errors.length} failed`);
      
      return {
        successful: generatedInvoices,
        failed: errors,
        summary: {
          totalGenerated: generatedInvoices.length,
          totalFailed: errors.length,
          period: { from: fromDate, to: toDate }
        }
      };
    } catch (error) {
      logger.error('Error generating monthly invoices:', error);
      throw error;
    }
  }

  static async getEntitiesWithOrders(fromDate, toDate) {
    try {
      const orderServiceUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3004';
      const response = await axios.get(`${orderServiceUrl}/orders/reports/entities-with-orders`, {
        params: { startDate: fromDate, endDate: toDate }
      });
      
      if (response.data.success) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      logger.error('Error fetching entities with orders:', error);
      return [];
    }
  }

  static async downloadInvoice(id) {
    try {
      const invoice = await Invoice.findById(id);
      if (!invoice) {
        throw new NotFoundError('Invoice not found');
      }

      if (!invoice.pdfUrl) {
        throw new BusinessLogicError('Invoice PDF not available');
      }

      const filepath = path.join(process.cwd(), invoice.pdfUrl);
      
      if (!fs.existsSync(filepath)) {
        throw new NotFoundError('Invoice PDF file not found');
      }

      return {
        filepath,
        filename: `invoice_${invoice.id}.pdf`,
        contentType: 'application/pdf'
      };
    } catch (error) {
      logger.error('Error downloading invoice:', error);
      throw error;
    }
  }

  static async regenerateInvoicePDF(id) {
    try {
      const invoice = await Invoice.findById(id);
      if (!invoice) {
        throw new NotFoundError('Invoice not found');
      }

      // Get orders for the invoice
      const orders = await this.getOrdersForPeriod(
        invoice.userId,
        invoice.companyId,
        invoice.period.from,
        invoice.period.to
      );

      // Generate new PDF
      const pdfUrl = await this.generateInvoicePDF(invoice, orders, {});
      
      // Update invoice with new PDF URL
      const updatedInvoice = await Invoice.updatePdfUrl(id, pdfUrl);

      logger.info(`Invoice PDF regenerated: ${id}`);
      return updatedInvoice;
    } catch (error) {
      logger.error('Error regenerating invoice PDF:', error);
      throw error;
    }
  }
}