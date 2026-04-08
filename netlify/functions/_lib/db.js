const { Pool } = require('pg');

let pool;

function createMissingDbError() {
  const error = new Error('Database is not configured');
  error.status = 503;
  error.details = 'Missing Postgres connection string';
  return error;
}

function getDatabaseUrl() {
  return (
    process.env.NETLIFY_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    ''
  );
}

function getPool() {
  if (pool) return pool;

  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw createMissingDbError();
  }

  pool = new Pool({
    connectionString,
    ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
    max: Number(process.env.PG_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 10000),
  });

  return pool;
}

async function query(text, params) {
  return getPool().query(text, params);
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
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getDatabaseUrl,
  getPool,
  query,
  withTransaction,
};
