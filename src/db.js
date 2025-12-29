const { Pool } = require('pg');
require('dotenv').config();
const logger = require('./utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle Postgres client', err);
});

// Query timing threshold for slow query detection (500ms)
const SLOW_QUERY_THRESHOLD_MS = 500;

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log query execution
    const logContext = {
      duration: `${duration}ms`,
      rows: res.rowCount,
      query: text.substring(0, 100), // Truncate long queries
    };
    
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn('Slow database query detected', logContext);
    } else {
      logger.debug('Executed query', logContext);
    }
    
    return res;
  } catch (error) {
    logger.error('Database query error', error, {
      query: text.substring(0, 100),
      params: params ? JSON.stringify(params).substring(0, 100) : 'none',
    });
    throw error;
  }
};

const checkConnection = async () => {
  try {
    await pool.query('SELECT NOW()');
    return true;
  } catch (error) {
    logger.error('Database connection check failed', error);
    return false;
  }
};

module.exports = {
  query,
  pool,
  checkConnection,
};
