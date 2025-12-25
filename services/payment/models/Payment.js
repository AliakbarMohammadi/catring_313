import { getPool } from '../config/database.js';
import { createLogger } from '@tadbir-khowan/shared';

const logger = createLogger('payment-model');

export class Payment {
  constructor(data) {
    this.id = data.id;
    this.orderId = data.orderId;
    this.amount = data.amount;
    this.method = data.method;
    this.status = data.status || 'pending';
    this.transactionId = data.transactionId;
    this.gatewayResponse = data.gatewayResponse;
    this.createdAt = data.createdAt;
    this.completedAt = data.completedAt;
  }

  static async create(paymentData) {
    const pool = getPool();
    const query = `
      INSERT INTO payments (order_id, amount, method, status, transaction_id, gateway_response)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [
        paymentData.orderId,
        paymentData.amount,
        paymentData.method,
        paymentData.status || 'pending',
        paymentData.transactionId || null,
        paymentData.gatewayResponse ? JSON.stringify(paymentData.gatewayResponse) : null
      ]);
      
      const row = result.rows[0];
      return new Payment({
        ...row,
        orderId: row.order_id,
        transactionId: row.transaction_id,
        gatewayResponse: row.gateway_response,
        createdAt: row.created_at,
        completedAt: row.completed_at
      });
    } catch (error) {
      logger.error('Error creating payment:', error);
      throw error;
    }
  }

  static async findById(id) {
    const pool = getPool();
    const query = 'SELECT * FROM payments WHERE id = $1';
    
    try {
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return new Payment({
        ...row,
        orderId: row.order_id,
        transactionId: row.transaction_id,
        gatewayResponse: row.gateway_response,
        createdAt: row.created_at,
        completedAt: row.completed_at
      });
    } catch (error) {
      logger.error('Error finding payment by id:', error);
      throw error;
    }
  }

  static async findByOrderId(orderId) {
    const pool = getPool();
    const query = 'SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC';
    
    try {
      const result = await pool.query(query, [orderId]);
      return result.rows.map(row => new Payment({
        ...row,
        orderId: row.order_id,
        transactionId: row.transaction_id,
        gatewayResponse: row.gateway_response,
        createdAt: row.created_at,
        completedAt: row.completed_at
      }));
    } catch (error) {
      logger.error('Error finding payments by order id:', error);
      throw error;
    }
  }

  static async updateStatus(id, status, transactionId = null, gatewayResponse = null) {
    const pool = getPool();
    const query = `
      UPDATE payments 
      SET status = $1, 
          transaction_id = COALESCE($2, transaction_id),
          gateway_response = COALESCE($3, gateway_response),
          completed_at = CASE WHEN $1 IN ('completed', 'failed', 'refunded') THEN NOW() ELSE completed_at END
      WHERE id = $4
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [
        status,
        transactionId,
        gatewayResponse ? JSON.stringify(gatewayResponse) : null,
        id
      ]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return new Payment({
        ...row,
        orderId: row.order_id,
        transactionId: row.transaction_id,
        gatewayResponse: row.gateway_response,
        createdAt: row.created_at,
        completedAt: row.completed_at
      });
    } catch (error) {
      logger.error('Error updating payment status:', error);
      throw error;
    }
  }

  static async findByStatus(status, limit = 100) {
    const pool = getPool();
    const query = 'SELECT * FROM payments WHERE status = $1 ORDER BY created_at DESC LIMIT $2';
    
    try {
      const result = await pool.query(query, [status, limit]);
      return result.rows.map(row => new Payment({
        ...row,
        orderId: row.order_id,
        transactionId: row.transaction_id,
        gatewayResponse: row.gateway_response,
        createdAt: row.created_at,
        completedAt: row.completed_at
      }));
    } catch (error) {
      logger.error('Error finding payments by status:', error);
      throw error;
    }
  }

  static async findByDateRange(startDate, endDate, limit = 1000) {
    const pool = getPool();
    const query = `
      SELECT * FROM payments 
      WHERE created_at >= $1 AND created_at <= $2 
      ORDER BY created_at DESC 
      LIMIT $3
    `;
    
    try {
      const result = await pool.query(query, [startDate, endDate, limit]);
      return result.rows.map(row => new Payment({
        ...row,
        orderId: row.order_id,
        transactionId: row.transaction_id,
        gatewayResponse: row.gateway_response,
        createdAt: row.created_at,
        completedAt: row.completed_at
      }));
    } catch (error) {
      logger.error('Error finding payments by date range:', error);
      throw error;
    }
  }
}