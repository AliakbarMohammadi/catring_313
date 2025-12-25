import { getPool } from '../config/database.js';
import { createLogger } from '@tadbir-khowan/shared';

const logger = createLogger('food-item-model');

export class FoodItem {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.category = data.category;
    this.basePrice = data.basePrice;
    this.imageUrl = data.imageUrl;
    this.ingredients = data.ingredients || [];
    this.allergens = data.allergens || [];
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async create(foodItemData) {
    const pool = getPool();
    const query = `
      INSERT INTO food_items (name, description, category, base_price, image_url, ingredients, allergens, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [
        foodItemData.name,
        foodItemData.description,
        foodItemData.category,
        foodItemData.basePrice,
        foodItemData.imageUrl || null,
        JSON.stringify(foodItemData.ingredients || []),
        JSON.stringify(foodItemData.allergens || []),
        foodItemData.isActive !== undefined ? foodItemData.isActive : true
      ]);
      
      const row = result.rows[0];
      return new FoodItem({
        ...row,
        basePrice: parseFloat(row.base_price),
        imageUrl: row.image_url,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ingredients: JSON.parse(row.ingredients || '[]'),
        allergens: JSON.parse(row.allergens || '[]')
      });
    } catch (error) {
      logger.error('Error creating food item:', error);
      throw error;
    }
  }

  static async findById(id) {
    const pool = getPool();
    const query = 'SELECT * FROM food_items WHERE id = $1';
    
    try {
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return new FoodItem({
        ...row,
        basePrice: parseFloat(row.base_price),
        imageUrl: row.image_url,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ingredients: JSON.parse(row.ingredients || '[]'),
        allergens: JSON.parse(row.allergens || '[]')
      });
    } catch (error) {
      logger.error('Error finding food item by id:', error);
      throw error;
    }
  }

  static async findAll(filters = {}) {
    const pool = getPool();
    let query = 'SELECT * FROM food_items WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (filters.category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(filters.category);
    }

    if (filters.isActive !== undefined) {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      params.push(filters.isActive);
    }

    query += ' ORDER BY created_at DESC';

    try {
      const result = await pool.query(query, params);
      return result.rows.map(row => new FoodItem({
        ...row,
        basePrice: parseFloat(row.base_price),
        imageUrl: row.image_url,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ingredients: JSON.parse(row.ingredients || '[]'),
        allergens: JSON.parse(row.allergens || '[]')
      }));
    } catch (error) {
      logger.error('Error finding food items:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    const pool = getPool();
    const fields = [];
    const params = [];
    let paramCount = 0;

    const allowedFields = ['name', 'description', 'category', 'basePrice', 'imageUrl', 'ingredients', 'allergens', 'isActive'];
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        paramCount++;
        let dbField = field;
        let value = updateData[field];

        // Map camelCase to snake_case
        if (field === 'basePrice') {
          dbField = 'base_price';
        } else if (field === 'imageUrl') {
          dbField = 'image_url';
        } else if (field === 'isActive') {
          dbField = 'is_active';
        } else if (field === 'ingredients' || field === 'allergens') {
          value = JSON.stringify(value);
        }

        fields.push(`${dbField} = $${paramCount}`);
        params.push(value);
      }
    }

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    paramCount++;
    fields.push(`updated_at = $${paramCount}`);
    params.push(new Date());

    paramCount++;
    const query = `
      UPDATE food_items 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    params.push(id);

    try {
      const result = await pool.query(query, params);
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return new FoodItem({
        ...row,
        basePrice: parseFloat(row.base_price),
        imageUrl: row.image_url,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ingredients: JSON.parse(row.ingredients || '[]'),
        allergens: JSON.parse(row.allergens || '[]')
      });
    } catch (error) {
      logger.error('Error updating food item:', error);
      throw error;
    }
  }

  static async delete(id) {
    const pool = getPool();
    const query = 'DELETE FROM food_items WHERE id = $1 RETURNING *';
    
    try {
      const result = await pool.query(query, [id]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error deleting food item:', error);
      throw error;
    }
  }

  static async getCategories() {
    const pool = getPool();
    const query = 'SELECT DISTINCT category FROM food_items WHERE is_active = true ORDER BY category';
    
    try {
      const result = await pool.query(query);
      return result.rows.map(row => row.category);
    } catch (error) {
      logger.error('Error getting categories:', error);
      throw error;
    }
  }
}