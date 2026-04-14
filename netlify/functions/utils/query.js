/**
 * Database Query Helpers - Query execution and transaction utilities
 */
const dbConfig = require('./db-config');

const { getPool } = dbConfig;

async function testConnection() {
  try {
    const result = await getPool().query('SELECT NOW() as now, version() as pg_version');
    console.log('Database connection test successful:', result.rows[0]);
    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error('Database connection test failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function query(text, params) {
  const start = Date.now();
  
  try {
    const result = await getPool().query(text, params);
    const duration = Date.now() - start;
    
    console.log('Executed query', { text: text.substring(0, 50), duration: `${duration}ms`, rows: result.rowCount });
    
    return result;
  } catch (error) {
    console.error('Query failed:', { text: text.substring(0, 50), error: error.message });
    throw error;
  }
}

async function queryOne(text, params) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

async function withTransaction(fn) {
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
      console.error('Transaction rolled back:', error.message);
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError.message);
    }
    throw error;
  } finally {
    client.release();
  }
}

async function closePool() {
  if (dbConfig.pool) {
    await dbConfig.pool.end();
    dbConfig.pool = null;
    dbConfig.poolConfig = null;
    console.log('Database pool closed');
  }
}

module.exports = {
  testConnection,
  query,
  queryOne,
  withTransaction,
  closePool,
};