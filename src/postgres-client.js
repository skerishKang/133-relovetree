/**
 * PostgreSQL Database Client (Alias for Firestore Compat Layer)
 *
 * IMPORTANT: This is an alias/wrapper file for gradual migration.
 *
 * Background:
 * - This project originally used Firebase Firestore for all data
 * - Migrated to Neon PostgreSQL for actual data storage
 * - firebase-firestore-compat.js provides API compatibility
 * - Actual data flows: compat layer → Netlify Functions → PostgreSQL
 *
 * Migration Status:
 * - Phase A (Current): Alias files created, documentation updated
 * - Phase B: New code uses postgres-client.js
 * - Phase C: Gradual adoption in existing modules
 * - Phase D: Original file deprecation (future)
 *
 * For new code, prefer:
 *   import { db } from './postgres-client.js';
 *   // or
 *   const db = window.postgresDB;
 *
 * Existing code continues to work:
 *   import { db } from './firebase-firestore-compat.js';
 *   // or
 *   const db = firebase.firestore();
 *
 * @see docs/analysis/FIRESTORE_COMPAT_ANALYSIS.md
 * @see docs/plans/DATABASE_NAMING_MIGRATION_PLAN.md
 */

// Re-export everything from the compat layer
// This ensures single source of truth while providing clearer naming
export {
  // Main database instance
  default as db,
  // Collection reference
  collection,
  // Document reference
  doc,
  // Query helpers
  query,
  where,
  orderBy,
  limit,
  // Operations
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  // Batch/Transaction
  writeBatch,
  runTransaction,
  // Field values
  serverTimestamp,
  increment,
  arrayUnion,
  deleteField,
  // Snapshot helpers
  onSnapshot,
  // Classes
  CollectionReference,
  DocumentReference,
  Query,
  WriteBatch,
  Transaction
} from './firebase-firestore-compat.js';

// Also provide a convenience default export
import postgresDB from './firebase-firestore-compat.js';
export default postgresDB;

// Global registration for browser environments (optional, for gradual migration)
if (typeof window !== 'undefined') {
  window.postgresDB = postgresDB;
}
