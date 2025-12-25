import { pool } from '../config/database.js';
import { NotFoundError, BusinessLogicError } from '@tadbir-khowan/shared';

export class UserRepository {
  async create(userData) {
    const {
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
      userType,
      companyId = null,
      isActive = true,
      emailVerified = false,
      phoneVerified = false
    } = userData;

    const query = `
      INSERT INTO users (
        email, password_hash, first_name, last_name, phone, 
        user_type, company_id, is_active, email_verified, phone_verified
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, email, first_name, last_name, phone, user_type, 
                company_id, is_active, email_verified, phone_verified, 
                created_at, updated_at
    `;

    try {
      const result = await pool.query(query, [
        email, passwordHash, firstName, lastName, phone,
        userType, companyId, isActive, emailVerified, phoneVerified
      ]);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new BusinessLogicError('Email already exists');
      }
      throw error;
    }
  }

  async findById(id) {
    const query = `
      SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.user_type,
             u.company_id, u.is_active, u.email_verified, u.phone_verified,
             u.created_at, u.updated_at,
             c.name as company_name, c.status as company_status
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByEmail(email) {
    const query = `
      SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, u.phone, 
             u.user_type, u.company_id, u.is_active, u.email_verified, u.phone_verified,
             u.created_at, u.updated_at,
             c.name as company_name, c.status as company_status
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.email = $1
    `;

    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  async update(id, updateData) {
    const allowedFields = [
      'first_name', 'last_name', 'phone', 'is_active', 
      'email_verified', 'phone_verified'
    ];
    
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        updates.push(`${key} = $${paramCount}`);
        values.push(updateData[key]);
        paramCount++;
      }
    });

    if (updates.length === 0) {
      throw new BusinessLogicError('No valid fields to update');
    }

    values.push(id);
    const query = `
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING id, email, first_name, last_name, phone, user_type,
                company_id, is_active, email_verified, phone_verified,
                created_at, updated_at
    `;

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    return result.rows[0];
  }

  async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    return result.rows[0];
  }

  async findByCompanyId(companyId, limit = 50, offset = 0) {
    const query = `
      SELECT id, email, first_name, last_name, phone, user_type,
             company_id, is_active, email_verified, phone_verified,
             created_at, updated_at
      FROM users
      WHERE company_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [companyId, limit, offset]);
    return result.rows;
  }

  async countByCompanyId(companyId) {
    const query = 'SELECT COUNT(*) as count FROM users WHERE company_id = $1';
    const result = await pool.query(query, [companyId]);
    return parseInt(result.rows[0].count);
  }

  async emailExists(email) {
    const query = 'SELECT id FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows.length > 0;
  }

  async updatePassword(id, passwordHash) {
    const query = `
      UPDATE users 
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id
    `;

    const result = await pool.query(query, [passwordHash, id]);
    
    if (result.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    return result.rows[0];
  }
}