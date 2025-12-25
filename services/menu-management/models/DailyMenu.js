import { getPool } from '../config/database.js';
import { createLogger } from '@tadbir-khowan/shared';

const logger = createLogger('daily-menu-model');

export class DailyMenu {
  constructor(data) {
    this.id = data.id;
    this.date = data.date;
    this.items = data.items || [];
    this.isPublished = data.isPublished !== undefined ? data.isPublished : false;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async create(menuData) {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create daily menu
      const menuQuery = `
        INSERT INTO daily_menus (date, is_published)
        VALUES ($1, $2)
        RETURNING *
      `;
      
      const menuResult = await client.query(menuQuery, [
        menuData.date,
        menuData.isPublished || false
      ]);
      
      const menu = menuResult.rows[0];
      
      // Add menu items if provided
      if (menuData.items && menuData.items.length > 0) {
        const itemsQuery = `
          INSERT INTO daily_menu_items (daily_menu_id, food_item_id, price, available_quantity, sold_quantity)
          VALUES ($1, $2, $3, $4, $5)
        `;
        
        for (const item of menuData.items) {
          await client.query(itemsQuery, [
            menu.id,
            item.foodItemId,
            item.price,
            item.availableQuantity || 0,
            0 // sold_quantity starts at 0
          ]);
        }
      }
      
      await client.query('COMMIT');
      
      // Fetch the complete menu with items
      return await this.findByDate(menuData.date);
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating daily menu:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async findByDate(date) {
    const pool = getPool();
    const query = `
      SELECT 
        dm.*,
        COALESCE(
          json_agg(
            json_build_object(
              'foodItemId', dmi.food_item_id,
              'price', dmi.price,
              'availableQuantity', dmi.available_quantity,
              'soldQuantity', dmi.sold_quantity,
              'foodItem', json_build_object(
                'id', fi.id,
                'name', fi.name,
                'description', fi.description,
                'category', fi.category,
                'imageUrl', fi.image_url,
                'ingredients', fi.ingredients,
                'allergens', fi.allergens
              )
            )
          ) FILTER (WHERE dmi.id IS NOT NULL), 
          '[]'
        ) as items
      FROM daily_menus dm
      LEFT JOIN daily_menu_items dmi ON dm.id = dmi.daily_menu_id
      LEFT JOIN food_items fi ON dmi.food_item_id = fi.id
      WHERE dm.date = $1
      GROUP BY dm.id, dm.date, dm.is_published, dm.created_at, dm.updated_at
    `;
    
    try {
      const result = await pool.query(query, [date]);
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return new DailyMenu({
        ...row,
        isPublished: row.is_published,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        items: row.items
      });
    } catch (error) {
      logger.error('Error finding daily menu by date:', error);
      throw error;
    }
  }

  static async findByDateRange(startDate, endDate) {
    const pool = getPool();
    const query = `
      SELECT 
        dm.*,
        COALESCE(
          json_agg(
            json_build_object(
              'foodItemId', dmi.food_item_id,
              'price', dmi.price,
              'availableQuantity', dmi.available_quantity,
              'soldQuantity', dmi.sold_quantity,
              'foodItem', json_build_object(
                'id', fi.id,
                'name', fi.name,
                'description', fi.description,
                'category', fi.category,
                'imageUrl', fi.image_url,
                'ingredients', fi.ingredients,
                'allergens', fi.allergens
              )
            )
          ) FILTER (WHERE dmi.id IS NOT NULL), 
          '[]'
        ) as items
      FROM daily_menus dm
      LEFT JOIN daily_menu_items dmi ON dm.id = dmi.daily_menu_id
      LEFT JOIN food_items fi ON dmi.food_item_id = fi.id
      WHERE dm.date BETWEEN $1 AND $2
      GROUP BY dm.id, dm.date, dm.is_published, dm.created_at, dm.updated_at
      ORDER BY dm.date
    `;
    
    try {
      const result = await pool.query(query, [startDate, endDate]);
      return result.rows.map(row => new DailyMenu({
        ...row,
        isPublished: row.is_published,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        items: row.items
      }));
    } catch (error) {
      logger.error('Error finding daily menus by date range:', error);
      throw error;
    }
  }

  static async update(date, updateData) {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update daily menu
      if (updateData.isPublished !== undefined) {
        const menuQuery = `
          UPDATE daily_menus 
          SET is_published = $1, updated_at = NOW()
          WHERE date = $2
          RETURNING *
        `;
        await client.query(menuQuery, [updateData.isPublished, date]);
      }
      
      // Update items if provided
      if (updateData.items) {
        // Delete existing items
        await client.query('DELETE FROM daily_menu_items WHERE daily_menu_id = (SELECT id FROM daily_menus WHERE date = $1)', [date]);
        
        // Add new items
        const itemsQuery = `
          INSERT INTO daily_menu_items (daily_menu_id, food_item_id, price, available_quantity, sold_quantity)
          VALUES ((SELECT id FROM daily_menus WHERE date = $1), $2, $3, $4, $5)
        `;
        
        for (const item of updateData.items) {
          await client.query(itemsQuery, [
            date,
            item.foodItemId,
            item.price,
            item.availableQuantity || 0,
            item.soldQuantity || 0
          ]);
        }
      }
      
      await client.query('COMMIT');
      
      // Return updated menu
      return await this.findByDate(date);
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating daily menu:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateInventory(date, foodItemId, quantitySold) {
    const pool = getPool();
    const query = `
      UPDATE daily_menu_items 
      SET sold_quantity = sold_quantity + $1
      WHERE daily_menu_id = (SELECT id FROM daily_menus WHERE date = $2)
        AND food_item_id = $3
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [quantitySold, date, foodItemId]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error updating inventory:', error);
      throw error;
    }
  }

  static async checkAvailability(date, foodItemId, requestedQuantity) {
    const pool = getPool();
    const query = `
      SELECT 
        available_quantity - sold_quantity as remaining_quantity
      FROM daily_menu_items 
      WHERE daily_menu_id = (SELECT id FROM daily_menus WHERE date = $1)
        AND food_item_id = $2
    `;
    
    try {
      const result = await pool.query(query, [date, foodItemId]);
      if (result.rows.length === 0) {
        return false; // Item not in menu
      }
      
      const remainingQuantity = parseInt(result.rows[0].remaining_quantity);
      return remainingQuantity >= requestedQuantity;
    } catch (error) {
      logger.error('Error checking availability:', error);
      throw error;
    }
  }

  static async publish(date) {
    const pool = getPool();
    const query = `
      UPDATE daily_menus 
      SET is_published = true, updated_at = NOW()
      WHERE date = $1
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [date]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error publishing daily menu:', error);
      throw error;
    }
  }

  static async unpublish(date) {
    const pool = getPool();
    const query = `
      UPDATE daily_menus 
      SET is_published = false, updated_at = NOW()
      WHERE date = $1
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [date]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error unpublishing daily menu:', error);
      throw error;
    }
  }

  static async delete(date) {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Delete menu items first (foreign key constraint)
      await client.query('DELETE FROM daily_menu_items WHERE daily_menu_id = (SELECT id FROM daily_menus WHERE date = $1)', [date]);
      
      // Delete daily menu
      const result = await client.query('DELETE FROM daily_menus WHERE date = $1', [date]);
      
      await client.query('COMMIT');
      return result.rowCount > 0;
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting daily menu:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}