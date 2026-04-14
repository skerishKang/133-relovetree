/**
 * Lovetree - Neon Postgres Connection Manager (Modular)
 * 
 * This file is now a thin wrapper that re-exports from modular sub-files:
 * - utils/db-config.js: Pool configuration and environment handling
 * - utils/query.js: Query execution and transaction utilities
 */
const dbConfig = require('./db-config');
const queryHelpers = require('./query');

const getDatabaseUrl = dbConfig.getDatabaseUrl;
const getSSLConfig = dbConfig.getSSLConfig;
const createPoolConfig = dbConfig.createPoolConfig;
const createPool = dbConfig.createPool;
const getPool = dbConfig.getPool;
const validateEnvironment = dbConfig.validateEnvironment;

const testConnection = queryHelpers.testConnection;
const query = queryHelpers.query;
const queryOne = queryHelpers.queryOne;
const withTransaction = queryHelpers.withTransaction;
const closePool = queryHelpers.closePool;

// For backward compatibility - export pool and config as properties
let pool = null;
Object.defineProperty(module.exports, 'pool', {
  get: () => getPool()
});

Object.defineProperty(module.exports, 'poolConfig', {
  get: () => dbConfig.poolConfig
});

module.exports = {
  getDatabaseUrl,
  getSSLConfig,
  createPoolConfig,
  createPool,
  getPool,
  validateEnvironment,
  testConnection,
  query,
  queryOne,
  withTransaction,
  closePool,
};