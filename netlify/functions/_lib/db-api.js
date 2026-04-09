/**
 * PostgreSQL Database API (Server-side Alias for Firestore Compat Layer)
 *
 * IMPORTANT: This is an alias/wrapper file for gradual migration.
 *
 * Background:
 * - This project originally used Firebase Firestore for all data
 * - Migrated to Neon PostgreSQL for actual data storage
 * - The actual data operations happen in document-store.js (PostgreSQL)
 * - firestore-api.js provides the Netlify Function endpoint handling
 *
 * Migration Status:
 * - Phase A (Current): Alias files created, documentation updated
 * - Phase B: New server code uses db-api.js
 * - Phase C: Gradual adoption in existing functions
 * - Phase D: Original file deprecation (future)
 *
 * For new server code, prefer:
 *   const { queryCollection, getDoc, setDoc } = require('./db-api');
 *
 * Existing code continues to work:
 *   const { queryCollection, getDoc, setDoc } = require('./firestore-api');
 *
 * @see docs/analysis/FIRESTORE_COMPAT_ANALYSIS.md
 * @see docs/plans/DATABASE_NAMING_MIGRATION_PLAN.md
 */

// Re-export all operations from firestore-api.js
// This provides clearer naming while maintaining compatibility
module.exports = {
  // Core operations
  ...require('./firestore-api'),

  // Additional exports with clearer names
  // These map to the same functions but with postgres-oriented naming

  /**
   * Query a collection in PostgreSQL via the compat layer
   * @param {Object} user - Authenticated user
   * @param {string} path - Collection path
   * @param {Object} constraints - Query constraints
   * @returns {Promise<{docs: Array}>}
   */
  queryPostgresCollection: require('./firestore-api').queryCollection,

  /**
   * Get a document from PostgreSQL via the compat layer
   * @param {Object} user - Authenticated user
   * @param {string} path - Document path
   * @returns {Promise<Object|null>}
   */
  getPostgresDoc: require('./firestore-api').getDoc,

  /**
   * Set/update a document in PostgreSQL via the compat layer
   * @param {Object} user - Authenticated user
   * @param {string} path - Document path
   * @param {Object} data - Document data
   * @param {Object} options - Set options (merge, etc.)
   * @returns {Promise<void>}
   */
  setPostgresDoc: require('./firestore-api').setDoc,

  /**
   * Update a document in PostgreSQL via the compat layer
   * @param {Object} user - Authenticated user
   * @param {string} path - Document path
   * @param {Object} data - Update data
   * @returns {Promise<void>}
   */
  updatePostgresDoc: require('./firestore-api').updateDoc,

  /**
   * Delete a document from PostgreSQL via the compat layer
   * @param {Object} user - Authenticated user
   * @param {string} path - Document path
   * @returns {Promise<void>}
   */
  deletePostgresDoc: require('./firestore-api').deleteDoc,

  /**
   * Run a batch operation on PostgreSQL via the compat layer
   * @param {Object} user - Authenticated user
   * @param {Array} writes - Array of write operations
   * @returns {Promise<void>}
   */
  batchPostgresWrite: require('./firestore-api').batchWrite,

  /**
   * Run a transaction on PostgreSQL via the compat layer
   * @param {Object} user - Authenticated user
   * @param {Array} operations - Transaction operations
   * @returns {Promise<any>}
   */
  runPostgresTransaction: require('./firestore-api').runTransaction,

  // Helper functions with clearer names
  /**
   * Check if user has admin role in PostgreSQL
   * @param {Object} user - Authenticated user
   * @returns {Promise<boolean>}
   */
  isPostgresAdmin: require('./firestore-api').isAdminUser,

  /**
   * Assert authorization for a PostgreSQL operation
   * @param {Object} user - Authenticated user
   * @param {string} op - Operation name
   * @param {string} path - Resource path
   * @param {Object} payload - Operation payload
   * @returns {Promise<void>}
   */
  assertPostgresAuthorized: require('./firestore-api').assertAuthorized,
};

// Also re-export the document store for direct PostgreSQL access
module.exports.documentStore = require('./document-store');
