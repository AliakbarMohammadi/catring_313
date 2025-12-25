import { getPool } from '../config/database.js';
import { createLogger } from '@tadbir-khowan/shared';

const logger = createLogger('financial-record-model');

export class FinancialRecord {
  constructor(data) {
    this.id = data.id;
    this.transactionType = data.transactionType;
    this.referenceId = data.referenceId;
    this.userId = data.userId;
    this.companyId = data.companyId;
    this.amount = data.amount;
    this.description = data.description;
    this.metadata = data.metadata;
    this.createdAt = data.createdAt;
  }

  static async create(recordData) {
    const pool = getPool();
    const query = `
      INSERT INTO financial_records (transaction_type, reference_id, user_id, company_id, amount, description, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [
        recordData.transactionType,
        recordData.referenceId,
        recordData.userId,
        recordData.companyId || null,
        recordData.amount,
        recordData.description || null,
        recordData.metadata ? JSON.stringify(recordData.metadata) : null
      ]);
      
      const row = result.rows[0];
      return new FinancialRecord({
        ...row,
        transactionType: row.transaction_type,
        referenceId: row.reference_id,
        userId: row.user_id,
        companyId: row.company_id,
        createdAt: row.created_at
      });
    } catch (error) {
      logger.error('Error creating financial record:', error);
      throw error;
    }
  }

  static async findById(id) {
    const pool = getPool();
    const query = 'SELECT * FROM financial_records WHERE id = $1';
    
    try {
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return new FinancialRecord({
        ...row,
        transactionType: row.transaction_type,
        referenceId: row.reference_id,
        userId: row.user_id,
        companyId: row.company_id,
        createdAt: row.created_at
      });
    } catch (error) {
      logger.error('Error finding financial record by id:', error);
      throw error;
    }
  }

  static async findByUserId(userId, filters = {}) {
    const pool = getPool();
    let query = 'SELECT * FROM financial_records WHERE user_id = $1';
    const params = [userId];
    let paramCount = 1;

    if (filters.transactionType) {
      paramCount++;
      query += ` AND transaction_type = $${paramCount}`;
      params.push(filters.transactionType);
    }

    if (filters.startDate && filters.endDate) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      params.push(filters.startDate);
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
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
      return result.rows.map(row => new FinancialRecord({
        ...row,
        transactionType: row.transaction_type,
        referenceId: row.reference_id,
        userId: row.user_id,
        companyId: row.company_id,
        createdAt: row.created_at
      }));
    } catch (error) {
      logger.error('Error finding financial records by user id:', error);
      throw error;
    }
  }

  static async findByCompanyId(companyId, filters = {}) {
    const pool = getPool();
    let query = 'SELECT * FROM financial_records WHERE company_id = $1';
    const params = [companyId];
    let paramCount = 1;

    if (filters.transactionType) {
      paramCount++;
      query += ` AND transaction_type = $${paramCount}`;
      params.push(filters.transactionType);
    }

    if (filters.startDate && filters.endDate) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      params.push(filters.startDate);
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
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
      return result.rows.map(row => new FinancialRecord({
        ...row,
        transactionType: row.transaction_type,
        referenceId: row.reference_id,
        userId: row.user_id,
        companyId: row.company_id,
        createdAt: row.created_at
      }));
    } catch (error) {
      logger.error('Error finding financial records by company id:', error);
      throw error;
    }
  }

  static async findByReferenceId(referenceId) {
    const pool = getPool();
    const query = 'SELECT * FROM financial_records WHERE reference_id = $1 ORDER BY created_at DESC';
    
    try {
      const result = await pool.query(query, [referenceId]);
      return result.rows.map(row => new FinancialRecord({
        ...row,
        transactionType: row.transaction_type,
        referenceId: row.reference_id,
        userId: row.user_id,
        companyId: row.company_id,
        createdAt: row.created_at
      }));
    } catch (error) {
      logger.error('Error finding financial records by reference id:', error);
      throw error;
    }
  }

  static async findByDateRange(startDate, endDate, filters = {}) {
    const pool = getPool();
    let query = 'SELECT * FROM financial_records WHERE created_at >= $1 AND created_at <= $2';
    const params = [startDate, endDate];
    let paramCount = 2;

    if (filters.transactionType) {
      paramCount++;
      query += ` AND transaction_type = $${paramCount}`;
      params.push(filters.transactionType);
    }

    if (filters.userId) {
      paramCount++;
      query += ` AND user_id = $${paramCount}`;
      params.push(filters.userId);
    }

    if (filters.companyId) {
      paramCount++;
      query += ` AND company_id = $${paramCount}`;
      params.push(filters.companyId);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }
    
    try {
      const result = await pool.query(query, params);
      return result.rows.map(row => new FinancialRecord({
        ...row,
        transactionType: row.transaction_type,
        referenceId: row.reference_id,
        userId: row.user_id,
        companyId: row.company_id,
        createdAt: row.created_at
      }));
    } catch (error) {
      logger.error('Error finding financial records by date range:', error);
      throw error;
    }
  }
}