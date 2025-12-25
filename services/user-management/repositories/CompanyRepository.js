import { pool } from '../config/database.js';
import { NotFoundError, BusinessLogicError } from '@tadbir-khowan/shared';

export class CompanyRepository {
  async create(companyData) {
    const {
      name,
      registrationNumber,
      address,
      contactPerson,
      email,
      phone,
      adminUserId,
      companyCode
    } = companyData;

    const query = `
      INSERT INTO companies (
        name, registration_number, address, contact_person, 
        email, phone, admin_user_id, company_code, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING id, name, registration_number, address, contact_person,
                email, phone, status, admin_user_id, company_code,
                created_at, updated_at
    `;

    try {
      const result = await pool.query(query, [
        name, registrationNumber, address, contactPerson,
        email, phone, adminUserId, companyCode
      ]);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        if (error.constraint === 'companies_registration_number_key') {
          throw new BusinessLogicError('Registration number already exists');
        }
        if (error.constraint === 'companies_company_code_key') {
          throw new BusinessLogicError('Company code already exists');
        }
      }
      throw error;
    }
  }

  async findById(id) {
    const query = `
      SELECT c.id, c.name, c.registration_number, c.address, c.contact_person,
             c.email, c.phone, c.status, c.admin_user_id, c.company_code,
             c.rejection_reason, c.created_at, c.updated_at, c.approved_at,
             u.email as admin_email, u.first_name as admin_first_name, 
             u.last_name as admin_last_name
      FROM companies c
      LEFT JOIN users u ON c.admin_user_id = u.id
      WHERE c.id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByStatus(status, limit = 50, offset = 0) {
    const query = `
      SELECT c.id, c.name, c.registration_number, c.address, c.contact_person,
             c.email, c.phone, c.status, c.admin_user_id, c.company_code,
             c.rejection_reason, c.created_at, c.updated_at, c.approved_at,
             u.email as admin_email, u.first_name as admin_first_name, 
             u.last_name as admin_last_name
      FROM companies c
      LEFT JOIN users u ON c.admin_user_id = u.id
      WHERE c.status = $1
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [status, limit, offset]);
    return result.rows;
  }

  async findByCompanyCode(companyCode) {
    const query = `
      SELECT c.id, c.name, c.registration_number, c.address, c.contact_person,
             c.email, c.phone, c.status, c.admin_user_id, c.company_code,
             c.rejection_reason, c.created_at, c.updated_at, c.approved_at
      FROM companies c
      WHERE c.company_code = $1 AND c.status = 'approved'
    `;

    const result = await pool.query(query, [companyCode]);
    return result.rows[0] || null;
  }

  async updateStatus(id, status, rejectionReason = null) {
    const approvedAt = status === 'approved' ? 'NOW()' : null;
    
    const query = `
      UPDATE companies 
      SET status = $1, rejection_reason = $2, approved_at = ${approvedAt ? 'NOW()' : 'NULL'}, updated_at = NOW()
      WHERE id = $3
      RETURNING id, name, registration_number, address, contact_person,
                email, phone, status, admin_user_id, company_code,
                rejection_reason, created_at, updated_at, approved_at
    `;

    const result = await pool.query(query, [status, rejectionReason, id]);
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Company not found');
    }

    return result.rows[0];
  }

  async update(id, updateData) {
    const allowedFields = [
      'name', 'address', 'contact_person', 'email', 'phone'
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
      UPDATE companies 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING id, name, registration_number, address, contact_person,
                email, phone, status, admin_user_id, company_code,
                rejection_reason, created_at, updated_at, approved_at
    `;

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Company not found');
    }

    return result.rows[0];
  }

  async delete(id) {
    const query = 'DELETE FROM companies WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Company not found');
    }

    return result.rows[0];
  }

  async countByStatus(status) {
    const query = 'SELECT COUNT(*) as count FROM companies WHERE status = $1';
    const result = await pool.query(query, [status]);
    return parseInt(result.rows[0].count);
  }

  async registrationNumberExists(registrationNumber) {
    const query = 'SELECT id FROM companies WHERE registration_number = $1';
    const result = await pool.query(query, [registrationNumber]);
    return result.rows.length > 0;
  }

  async companyCodeExists(companyCode) {
    const query = 'SELECT id FROM companies WHERE company_code = $1';
    const result = await pool.query(query, [companyCode]);
    return result.rows.length > 0;
  }

  async generateUniqueCompanyCode() {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      // Generate 6-character alphanumeric code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const exists = await this.companyCodeExists(code);
      if (!exists) {
        return code;
      }
      
      attempts++;
    }

    throw new BusinessLogicError('Unable to generate unique company code');
  }
}