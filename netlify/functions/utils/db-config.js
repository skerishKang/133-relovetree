/**
 * Database Configuration - Pool settings and environment handling
 */
const { Pool } = require('pg');

let pool = null;
let poolConfig = null;

function getDatabaseUrl() {
  return (
    process.env.NETLIFY_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_PRIMARY_URL ||
    ''
  );
}

function getSSLConfig() {
  const isLocal = process.env.NETLIFY_LOCAL || 
                  process.env.NODE_ENV === 'development' ||
                  getDatabaseUrl().includes('localhost');
  
  if (isLocal || process.env.PGSSL === 'disable') {
    return false;
  }
  
  return {
    rejectUnauthorized: false,
    requestCert: true
  };
}

function createPoolConfig() {
  const connectionString = getDatabaseUrl();
  
  if (!connectionString) {
    return null;
  }

  return {
    connectionString,
    ssl: getSSLConfig(),
    max: parseInt(process.env.PG_POOL_MAX || '10', 10),
    idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT_MS || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.PG_CONNECT_TIMEOUT_MS || '5000', 10),
  };
}

function createPool() {
  if (pool) return pool;

  const config = createPoolConfig();
  
  if (!config) {
    const error = new Error('DATABASE_URL 환경변수가 설정되지 않았습니다');
    error.name = 'MissingDatabaseConfig';
    error.status = 503;
    throw error;
  }

  pool = new Pool(config);
  poolConfig = config;

  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err.message);
  });

  pool.on('connect', () => {
    console.log('New database connection established');
  });

  return pool;
}

function getPool() {
  if (!pool) {
    return createPool();
  }
  return pool;
}

function validateEnvironment() {
  const url = getDatabaseUrl();
  
  if (!url) {
    console.warn('⚠️  WARNING: DATABASE_URL environment variable is not set');
    console.warn('   Please set NETLIFY_DATABASE_URL, DATABASE_URL, or POSTGRES_URL');
    return false;
  }
  
  if (!url.startsWith('postgres')) {
    console.warn('⚠️  WARNING: DATABASE_URL does not appear to be a valid PostgreSQL connection string');
    return false;
  }
  
  return true;
}

module.exports = {
  getDatabaseUrl,
  getSSLConfig,
  createPoolConfig,
  createPool,
  getPool,
  validateEnvironment,
};