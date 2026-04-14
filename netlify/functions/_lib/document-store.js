/**
 * Document Store - Core Data Layer (Modular)
 * 
 * This is the ONLY file that writes SQL to Neon/PostgreSQL.
 * All Firestore-style transforms (increment, serverTimestamp, arrayUnion, delete)
 * are processed HERE into actual SQL values before persisting.
 * 
 * Architecture (full data path):
 *   Browser → postgres-client-browser.js → firebase-firestore-compat.js (shim)
 *     → /api/firestore → firestore-api.js → [THIS FILE] → Neon/PostgreSQL
 * 
 * This file re-exports from modular sub-files in the `store/` directory.
 * Use this as the entry point for document operations.
 */

const crud = require('./store/crud');
const transform = require('./store/transform');
const schema = require('./store/schema');
const error = require('./store/error');
const batch = require('./store/batch');

const { getCollectionConfig, TABLE_CONFIG } = schema;
const { applyTransform, applyPatch, DELETE_SENTINEL } = transform;
const { httpError } = error;

async function getDoc(path) {
  return crud.getDoc(path);
}

async function setDoc(path, data, options = {}) {
  return crud.setDoc(path, data, options);
}

async function updateDoc(path, patch) {
  return crud.updateDoc(path, patch);
}

async function deleteDoc(path) {
  return crud.deleteDoc(path);
}

async function queryCollection(path, constraints) {
  const { config, parentIds } = crud.resolveCollectionPath(path);
  const { query } = require('./db');
  const params = [];
  const where = [];

  if (config.parentColumn && config.parentIdField) {
    params.push(parentIds[config.parentIdField]);
    where.push(`${config.parentColumn} = $${params.length}`);
  }

  const constraintsWhere = constraints && constraints.where ? constraints.where : [];
  constraintsWhere.forEach((constraint) => {
    const field = String(constraint.field || '');
    const op = String(constraint.op || '==');
    const value = constraint.value;
    const meta = config.fields[field];
    crud.assertSafeFieldName(field);

    const left = meta ? meta.column : `payload ->> $${params.push(field)}`;

    if (op === '==') {
      params.push(meta && meta.type === 'boolean' ? Boolean(value) : value);
      where.push(`${left} = $${params.length}`);
      return;
    }

    if (op === '!=') {
      params.push(meta && meta.type === 'boolean' ? Boolean(value) : value);
      where.push(`${left} <> $${params.length}`);
      return;
    }

    if (['<', '<=', '>', '>='].includes(op) && meta) {
      params.push(value);
      where.push(`${left} ${op} $${params.length}`);
      return;
    }

    if (op === 'array-contains') {
      params.push(JSON.stringify([value]));
      where.push(`COALESCE(payload -> '${field}', '[]'::jsonb) @> $${params.length}::jsonb`);
      return;
    }

    throw httpError(400, `Unsupported query operator: ${op}`);
  });

  let sql = `SELECT id, payload FROM ${config.table}`;
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;

  const orderBy = Array.isArray(constraints && constraints.orderBy)
    ? constraints.orderBy
    : [];
  if (orderBy.length) {
    const pieces = orderBy.map((item) => {
      const field = String(item.field || '');
      crud.assertSafeFieldName(field);
      const direction = String(item.direction || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      const meta = config.fields[field];
      if (meta) return `${meta.column} ${direction} NULLS LAST`;
      return `(payload ->> '${field}') ${direction} NULLS LAST`;
    });
    sql += ` ORDER BY ${pieces.join(', ')}`;
  }

  const hasExplicitLimit =
    constraints &&
    Object.prototype.hasOwnProperty.call(constraints, 'limit') &&
    constraints.limit != null;
  if (hasExplicitLimit) {
    const limit = Number(constraints.limit);
    if (!Number.isFinite(limit) || !Number.isInteger(limit) || limit < 1) {
      throw httpError(400, 'limit must be a positive integer');
    }
    params.push(limit);
    sql += ` LIMIT $${params.length}`;
  }

  const result = await query(sql, params);
  return result.rows.map((row) => ({ id: row.id, data: row.payload || {} }));
}

async function addDoc(path, data) {
  const { config, parentIds } = crud.resolveCollectionPath(path);
  const id = crypto.randomUUID();
  const docPath =
    config.parentColumn && config.parentIdField
      ? `${config.parentCollection === 'trees' ? 'trees' : 'community_posts'}/${parentIds[config.parentIdField]}/${config.collection}/${id}`
      : `${config.collection}/${id}`;
  const saved = await setDoc(docPath, data, { merge: false });
  return { id, data: saved.data };
}

function getConfigByTableName(tableName) {
  return Object.values(TABLE_CONFIG).find(c => c.table === tableName) || null;
}

module.exports = {
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  queryCollection,
  addDoc,
  runTransaction: batch.runTransaction,
  getUserRole,
  getConfigByTableName,
  TABLE_CONFIG,
  getCollectionConfig,
  applyTransform,
  applyPatch,
  DELETE_SENTINEL,
};

async function getUserRole(uid) {
  if (!uid) return null;
  const doc = await getDoc(`users/${uid}`);
  return doc && doc.data ? doc.data.role || null : null;
}