import { Pool } from 'pg';

let pool;

if (!pool) {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured.');
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });
}

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();
