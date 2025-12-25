import pkg from 'pg';
import { createLogger } from '@tadbir-khowan/shared';

const { Pool } = pkg;
const logger = createLogger('reporting-database');

let pool;

export const initializeDatabase = async () => {
  try {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'tadbir_reporting',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // تست اتصال
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    logger.info('اتصال پایگاه داده با موفقیت برقرار شد');
    return true;
  } catch (error) {
    logger.error('راه‌اندازی اتصال پایگاه داده ناموفق بود', { error: error.message });
    return false;
  }
};

export const getPool = () => {
  if (!pool) {
    throw new Error('پایگاه داده راه‌اندازی نشده. ابتدا initializeDatabase() را فراخوانی کنید.');
  }
  return pool;
};

export const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};