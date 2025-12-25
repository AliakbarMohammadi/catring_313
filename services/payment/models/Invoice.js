import { getPool } from '../config/database.js';
import { createLogger } from '@tadbir-khowan/shared';

const logger = createLogger('invoice-model');

export class Invoice {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.companyId = data.companyId;
    this.period = {
      from: data.periodFrom || data.period?.from,
      to: data.periodTo || data.period?.to
    };
    this.orders = data.orders || [];
    this.subtotal = data.subtotal;
    this.tax = data.tax || 0;
    this.discount = data.discount || 0;
    this.total = data.total;
    this.status = data.status || 'draft';
    this.pdfUrl = data.pdfUrl;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async create(invoiceData) {
    const pool = getPool();
    const query = `
      INSERT INTO invoices (user_id, company_id, period_from, period_to, orders, subtotal, tax, discount, total, status, pdf_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [
        invoiceData.userId,
        invoiceData.companyId || null,
        invoiceData.period.from,
        invoiceData.period.to,
        JSON.stringify(invoiceData.orders || []),
        invoiceData.subtotal,
        invoiceData.tax || 0,
        invoiceData.discount || 0,
        invoiceData.total,
        invoiceData.status || 'draft',
        invoiceData.pdfUrl || null
      ]);
      
      const row = result.rows[0];
      return new Invoice({
        ...row,
        userId: row.user_id,
        companyId: row.company_id,
        periodFrom: row.period_from,
        periodTo: row.period_to,
        pdfUrl: row.pdf_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      });
    } catch (error) {
      logger.error('Error creating invoice:', error);
      throw error;
    }
  }

  static async findById(id) {
    const pool = getPool();
    const query = 'SELECT * FROM invoices WHERE id = $1';
    
    try {
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return new Invoice({
        ...row,
        userId: row.user_id,
        companyId: row.company_id,
        periodFrom: row.period_from,
        periodTo: row.period_to,
        pdfUrl: row.pdf_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      });
    } catch (error) {
      logger.error('Error finding invoice by id:', error);
      throw error;
    }
  }

  static async findByUserId(userId, filters = {}) {
    const pool = getPool();
    let query = 'SELECT * FROM invoices WHERE user_id = $1';
    const params = [userId];
    let paramCount = 1;

    if (filters.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.startDate && filters.endDate) {
      paramCount++;
      query += ` AND period_from >= $${paramCount}`;
      params.push(filters.startDate);
      paramCount++;
      query += ` AND period_to <= $${paramCount}`;
      params.push(filters.endDate);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }
    
    try {
      const result = await pool.query(query, params);
      return result.rows.map(row => new Invoice({
        ...row,
        userId: row.user_id,
        companyId: row.company_id,
        periodFrom: row.period_from,
        periodTo: row.period_to,
        pdfUrl: row.pdf_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      logger.error('Error finding invoices by user id:', error);
      throw error;
    }
  }

  static async findByCompanyId(companyId, filters = {}) {
    const pool = getPool();
    let query = 'SELECT * FROM invoices WHERE company_id = $1';
    const params = [companyId];
    let paramCount = 1;

    if (filters.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.startDate && filters.endDate) {
      paramCount++;
      query += ` AND period_from >= $${paramCount}`;
      params.push(filters.startDate);
      paramCount++;
      query += ` AND period_to <= $${paramCount}`;
      params.push(filters.endDate);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }
    
    try {
      const result = await pool.query(query, params);
      return result.rows.map(row => new Invoice({
        ...row,
        userId: row.user_id,
        companyId: row.company_id,
        periodFrom: row.period_from,
        periodTo: row.period_to,
        pdfUrl: row.pdf_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      logger.error('Error finding invoices by company id:', error);
      throw error;
    }
  }

  static async updateStatus(id, status) {
    const pool = getPool();
    const query = `
      UPDATE invoices 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [status, id]);
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return new Invoice({
        ...row,
        userId: row.user_id,
        companyId: row.company_id,
        periodFrom: row.period_from,
        periodTo: row.period_to,
        pdfUrl: row.pdf_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      });
    } catch (error) {
      logger.error('Error updating invoice status:', error);
      throw error;
    }
  }

  static async updatePdfUrl(id, pdfUrl) {
    const pool = getPool();
    const query = `
      UPDATE invoices 
      SET pdf_url = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [pdfUrl, id]);
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return new Invoice({
        ...row,
        userId: row.user_id,
        companyId: row.company_id,
        periodFrom: row.period_from,
        periodTo: row.period_to,
        pdfUrl: row.pdf_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      });
    } catch (error) {
      logger.error('Error updating invoice PDF URL:', error);
      throw error;
    }
  }

  static async findByPeriod(userId, companyId, periodFrom, periodTo) {
    const pool = getPool();
    let query = `
      SELECT * FROM invoices 
      WHERE period_from = $1 AND period_to = $2
    `;
    const params = [periodFrom, periodTo];
    let paramCount = 2;

    if (userId) {
      paramCount++;
      query += ` AND user_id = $${paramCount}`;
      params.push(userId);
    }

    if (companyId) {
      paramCount++;
      query += ` AND company_id = $${paramCount}`;
      params.push(companyId);
    }
    
    try {
      const result = await pool.query(query, params);
      return result.rows.map(row => new Invoice({
        ...row,
        userId: row.user_id,
        companyId: row.company_id,
        periodFrom: row.period_from,
        periodTo: row.period_to,
        pdfUrl: row.pdf_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      logger.error('Error finding invoices by period:', error);
      throw error;
    }
  }
}