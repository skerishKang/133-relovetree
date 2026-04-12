/**
 * Lovetree - Neon Postgres Connection Manager
 * 
 * Netlify Functions용 Database Connection Pool
 * 
 * 사용법:
 *   const { query, getPool } = require('./utils/db');
 *   const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
 */

const { Pool } = require('pg');

let pool = null;
let poolConfig = null;

/**
 * 데이터베이스 연결 URL 반환 (여러 환경변수 지원)
 */
function getDatabaseUrl() {
  return (
    process.env.NETLIFY_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_PRIMARY_URL ||
    ''
  );
}

/**
 * SSL 설정 반환
 */
function getSSLConfig() {
  // 로컬 development 환경에서는 SSL 비활성화
  const isLocal = process.env.NETLIFY_LOCAL || 
                  process.env.NODE_ENV === 'development' ||
                  getDatabaseUrl().includes('localhost');
  
  if (isLocal || process.env.PGSSL === 'disable') {
    return false;
  }
  
  // Neon/Production: SSL 필수
  return {
    rejectUnauthorized: false,
    requestCert: true
  };
}

/**
 * Pool 설정 생성
 */
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

/**
 * Pool 인스턴스 생성 (Lazy Initialization)
 */
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

  // Pool 이벤트 리스너
  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err.message);
  });

  pool.on('connect', () => {
    console.log('New database connection established');
  });

  return pool;
}

/**
 * Pool 반환 (Getter)
 */
function getPool() {
  if (!pool) {
    return createPool();
  }
  return pool;
}

/**
 * 연결 테스트
 */
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

/**
 * 쿼리 실행 (편의 함수)
 */
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

/**
 * 단일 행 반환 (첫 번째 행)
 */
async function queryOne(text, params) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

/**
 * 트랜잭션 실행
 */
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

/**
 * Pool 종료 (Graceful Shutdown)
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    poolConfig = null;
    console.log('Database pool closed');
  }
}

// 환경변수 검증
function validateEnvironment() {
  const url = getDatabaseUrl();
  
  if (!url) {
    console.warn('⚠️  WARNING: DATABASE_URL environment variable is not set');
    console.warn('   Please set NETLIFY_DATABASE_URL, DATABASE_URL, or POSTGRES_URL');
    return false;
  }
  
  // URL 형식 검증
  if (!url.startsWith('postgres')) {
    console.warn('⚠️  WARNING: DATABASE_URL does not appear to be a valid PostgreSQL connection string');
    return false;
  }
  
  return true;
}

// 모듈 로드 시 한 번만 검증 (선택적)
if (process.env.NODE_ENV !== 'test') {
  validateEnvironment();
}

module.exports = {
  // Config
  getDatabaseUrl,
  getPool,
  createPool,
  createPoolConfig,
  getSSLConfig,
  
  // Query
  query,
  queryOne,
  
  // Transaction
  withTransaction,
  
  // Utility
  testConnection,
  closePool,
  validateEnvironment,
};
