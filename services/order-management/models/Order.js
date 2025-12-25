import { getPool } from '../config/database.js';
import { createLogger } from '@tadbir-khowan/shared';

const logger = createLogger('order-model');

export class Order {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.companyId = data.companyId;
    this.orderDate = data.orderDate;
    this.deliveryDate = data.deliveryDate;
    this.items = data.items || [];
    this.totalAmount = data.totalAmount;
    this.discountAmount = data.discountAmount || 0;
    this.finalAmount = data.finalAmount;
    this.status = data.status || 'pending';
    this.paymentStatus = data.paymentStatus || 'pending';
    this.notes = data.notes;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async create(orderData) {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create order
      const orderQuery = `
        INSERT INTO orders (user_id, company_id, order_date, delivery_date, total_amount, discount_amount, final_amount, status, payment_status, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const orderResult = await client.query(orderQuery, [
        orderData.userId,
        orderData.companyId || null,
        orderData.orderDate || new Date(),
        orderData.deliveryDate,
        orderData.totalAmount,
        orderData.discountAmount || 0,
        orderData.finalAmount,
        orderData.status || 'pending',
        orderData.paymentStatus || 'pending',
        orderData.notes || null
      ]);
      
      const order = orderResult.rows[0];
      
      // Add order items
      if (orderData.items && orderData.items.length > 0) {
        const itemsQuery = `
          INSERT INTO order_items (order_id, food_item_id, quantity, unit_price, total_price)
          VALUES ($1, $2, $3, $4, $5)
        `;
        
        for (const item of orderData.items) {
          await client.query(itemsQuery, [
            order.id,
            item.foodItemId,
            item.quantity,
            item.unitPrice,
            item.totalPrice
          ]);
        }
      }
      
      await client.query('COMMIT');
      
      // Return complete order with items
      return await this.findById(order.id);
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating order:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async findById(id) {
    const pool = getPool();
    const query = `
      SELECT 
        o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'foodItemId', oi.food_item_id,
              'quantity', oi.quantity,
              'unitPrice', oi.unit_price,
              'totalPrice', oi.total_price
            )
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1
      GROUP BY o.id
    `;
    
    try {
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return new Order({
        ...row,
        userId: row.user_id,
        companyId: row.company_id,
        orderDate: row.order_date,
        deliveryDate: row.delivery_date,
        totalAmount: parseFloat(row.total_amount),
        discountAmount: parseFloat(row.discount_amount || 0),
        finalAmount: parseFloat(row.final_amount),
        paymentStatus: row.payment_status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        items: row.items
      });
    } catch (error) {
      logger.error('Error finding order by id:', error);
      throw error;
    }
  }

  static async findByUserId(userId, filters = {}) {
    const pool = getPool();
    let query = `
      SELECT 
        o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'foodItemId', oi.food_item_id,
              'quantity', oi.quantity,
              'unitPrice', oi.unit_price,
              'totalPrice', oi.total_price
            )
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = $1
    `;
    
    const params = [userId];
    let paramCount = 1;

    if (filters.status) {
      paramCount++;
      query += ` AND o.status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.deliveryDate) {
      paramCount++;
      query += ` AND o.delivery_date = $${paramCount}`;
      params.push(filters.deliveryDate);
    }

    if (filters.startDate && filters.endDate) {
      paramCount++;
      query += ` AND o.delivery_date BETWEEN $${paramCount}`;
      params.push(filters.startDate);
      paramCount++;
      query += ` AND $${paramCount}`;
      params.push(filters.endDate);
    }

    query += ' GROUP BY o.id ORDER BY o.created_at DESC';

    try {
      const result = await pool.query(query, params);
      return result.rows.map(row => new Order({
        ...row,
        userId: row.user_id,
        companyId: row.company_id,
        orderDate: row.order_date,
        deliveryDate: row.delivery_date,
        totalAmount: parseFloat(row.total_amount),
        discountAmount: parseFloat(row.discount_amount || 0),
        finalAmount: parseFloat(row.final_amount),
        paymentStatus: row.payment_status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        items: row.items
      }));
    } catch (error) {
      logger.error('Error finding orders by user id:', error);
      throw error;
    }
  }

  static async findByCompanyId(companyId, filters = {}) {
    const pool = getPool();
    let query = `
      SELECT 
        o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'foodItemId', oi.food_item_id,
              'quantity', oi.quantity,
              'unitPrice', oi.unit_price,
              'totalPrice', oi.total_price
            )
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.company_id = $1
    `;
    
    const params = [companyId];
    let paramCount = 1;

    if (filters.status) {
      paramCount++;
      query += ` AND o.status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.deliveryDate) {
      paramCount++;
      query += ` AND o.delivery_date = $${paramCount}`;
      params.push(filters.deliveryDate);
    }

    if (filters.startDate && filters.endDate) {
      paramCount++;
      query += ` AND o.delivery_date BETWEEN $${paramCount}`;
      params.push(filters.startDate);
      paramCount++;
      query += ` AND $${paramCount}`;
      params.push(filters.endDate);
    }

    query += ' GROUP BY o.id ORDER BY o.created_at DESC';

    try {
      const result = await pool.query(query, params);
      return result.rows.map(row => new Order({
        ...row,
        userId: row.user_id,
        companyId: row.company_id,
        orderDate: row.order_date,
        deliveryDate: row.delivery_date,
        totalAmount: parseFloat(row.total_amount),
        discountAmount: parseFloat(row.discount_amount || 0),
        finalAmount: parseFloat(row.final_amount),
        paymentStatus: row.payment_status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        items: row.items
      }));
    } catch (error) {
      logger.error('Error finding orders by company id:', error);
      throw error;
    }
  }

  static async updateStatus(id, status) {
    const pool = getPool();
    const query = `
      UPDATE orders 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [status, id]);
      if (result.rows.length === 0) {
        return null;
      }
      
      return await this.findById(id);
    } catch (error) {
      logger.error('Error updating order status:', error);
      throw error;
    }
  }

  static async updatePaymentStatus(id, paymentStatus) {
    const pool = getPool();
    const query = `
      UPDATE orders 
      SET payment_status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [paymentStatus, id]);
      if (result.rows.length === 0) {
        return null;
      }
      
      return await this.findById(id);
    } catch (error) {
      logger.error('Error updating payment status:', error);
      throw error;
    }
  }

  static async cancel(id, reason = null) {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update order status
      const updateQuery = `
        UPDATE orders 
        SET status = 'cancelled', notes = COALESCE(notes || ' | ', '') || $1, updated_at = NOW()
        WHERE id = $2 AND status IN ('pending', 'confirmed')
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, [
        reason ? `Cancelled: ${reason}` : 'Cancelled by user',
        id
      ]);
      
      if (result.rows.length === 0) {
        throw new Error('Order not found or cannot be cancelled');
      }
      
      await client.query('COMMIT');
      
      return await this.findById(id);
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error cancelling order:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async findAll(filters = {}) {
    const pool = getPool();
    let query = `
      SELECT 
        o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'foodItemId', oi.food_item_id,
              'quantity', oi.quantity,
              'unitPrice', oi.unit_price,
              'totalPrice', oi.total_price
            )
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (filters.status) {
      paramCount++;
      query += ` AND o.status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.deliveryDate) {
      paramCount++;
      query += ` AND o.delivery_date = $${paramCount}`;
      params.push(filters.deliveryDate);
    }

    if (filters.startDate && filters.endDate) {
      paramCount++;
      query += ` AND o.delivery_date BETWEEN $${paramCount}`;
      params.push(filters.startDate);
      paramCount++;
      query += ` AND $${paramCount}`;
      params.push(filters.endDate);
    }

    query += ' GROUP BY o.id ORDER BY o.created_at DESC';

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    try {
      const result = await pool.query(query, params);
      return result.rows.map(row => new Order({
        ...row,
        userId: row.user_id,
        companyId: row.company_id,
        orderDate: row.order_date,
        deliveryDate: row.delivery_date,
        totalAmount: parseFloat(row.total_amount),
        discountAmount: parseFloat(row.discount_amount || 0),
        finalAmount: parseFloat(row.final_amount),
        paymentStatus: row.payment_status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        items: row.items
      }));
    } catch (error) {
      logger.error('Error finding all orders:', error);
      throw error;
    }
  }
}