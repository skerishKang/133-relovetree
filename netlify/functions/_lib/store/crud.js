/**
 * CRUD Primitives - Basic database operations for documents
 */
const crypto = require('crypto');
const { query, withTransaction } = require('../db');
const { httpError, formatNotFoundError, formatDatabaseError } = require('./error');
const { applyPatch, normalizeDateValue, DELETE_SENTINEL } = require('./transform');
const { getCollectionConfig } = require('./schema');

function assertSafeFieldName(field) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
    throw httpError(400, 'Unsafe field name');
  }
}

function resolveCollectionPath(path) {
  const segments = String(path || '').split('/').filter(Boolean);
  const root = segments[0] || '';
  const config = getCollectionConfig(root);
  if (!config) throw httpError(400, `Unknown collection: ${root}`);
  
  const parentIds = {};
  if (config.parentColumn && config.parentIdField && segments.length >= 2) {
    parentIds[config.parentIdField] = segments[1];
  }
  
  return { config, parentIds, collection: root };
}

function resolveDocumentPath(path) {
  const segments = String(path || '').split('/').filter(Boolean);
  const root = segments[0] || '';
  const config = getCollectionConfig(root);
  if (!config) throw httpError(400, `Unknown collection: ${root}`);
  
  const isRootDoc = segments.length === 2;
  const parentIds = {};
  let id = null;
  
  if (config.parentColumn && config.parentIdField) {
    if (segments.length < 4) throw httpError(400, 'Invalid document path');
    parentIds[config.parentIdField] = segments[1];
    id = segments[3];
  } else {
    if (!isRootDoc) throw httpError(400, 'Invalid document path');
    id = segments[1];
  }
  
  return { config, id, parentIds, collection: root };
}

function rowToDoc(row) {
  return { id: row.id, data: row.payload || {} };
}

async function selectOne(client, config, id, parentIds) {
  const params = [id];
  let sql = `SELECT id, payload FROM ${config.table} WHERE id = $1`;
  
  if (config.parentColumn && parentIds && parentIds[config.parentIdField]) {
    params.push(parentIds[config.parentIdField]);
    sql += ` AND ${config.parentColumn} = $2`;
  }
  
  const result = client ? await client.query(sql, params) : await query(sql, params);
  return result.rows[0] || null;
}

function buildSetParams(config, data, parentIds) {
  const columns = [];
  const values = [];
  const placeholders = [];
  let paramIndex = 1;
  
  Object.entries(data || {}).forEach(([key, value]) => {
    const meta = config.fields[key];
    const column = meta ? meta.column : null;
    if (!column) return;
    
    columns.push(column);
    values.push(value);
    placeholders.push(`$${paramIndex++}`);
  });
  
  if (config.parentColumn && parentIds && parentIds[config.parentIdField]) {
    columns.push(config.parentColumn);
    values.push(parentIds[config.parentIdField]);
    placeholders.push(`$${paramIndex++}`);
  }
  
  return { columns, values, placeholders };
}

async function putDoc(client, path, data, options) {
  const resolved = resolveDocumentPath(path);
  const nowIso = new Date().toISOString();
  const merged = options.merge ? await selectOne(client, resolved.config, resolved.id, resolved.parentIds) : null;
  const base = merged ? merged.payload || {} : {};
  const final = applyPatch(base, data, nowIso);
  
  const payload = {};
  Object.entries(final).forEach(([key, value]) => {
    if (value === DELETE_SENTINEL) return;
    payload[key] = value;
  });
  
  const { columns, values, placeholders } = buildSetParams(resolved.config, payload, resolved.parentIds);
  
  if (!options.merge && columns.length === 0) {
    throw httpError(400, 'No valid fields to write');
  }
  
  const columnsToUpsert = [...columns];
  const valuesToUpsert = [...values];
  const placeholdersToUpsert = [...placeholders];
  
  if (resolved.config.fields.createdAt) {
    if (!merged) {
      columnsToUpsert.push('created_at');
      valuesToUpsert.push(nowIso);
      placeholdersToUpsert.push(`$${valuesToUpsert.length}`);
    }
  }
  
  if (resolved.config.fields.updatedAt) {
    columnsToUpsert.push('updated_at');
    valuesToUpsert.push(nowIso);
    placeholdersToUpsert.push(`$${valuesToUpsert.length}`);
  }
  
  if (options.merge) {
    const setClauses = columnsToUpsert.map((col, i) => `${col} = $${i + 1}`);
    const sql = `
      UPDATE ${resolved.config.table}
      SET ${setClauses.join(', ')}
      WHERE id = $${columnsToUpsert.length + 1}
      ${resolved.config.parentColumn && resolved.parentIds[resolved.config.parentIdField] 
        ? `AND ${resolved.config.parentColumn} = $${columnsToUpsert.length + 2}` 
        : ''}
      RETURNING id, payload
    `;
    const queryParams = [...valuesToUpsert, resolved.id];
    if (resolved.config.parentColumn && resolved.parentIds[resolved.config.parentIdField]) {
      queryParams.push(resolved.parentIds[resolved.config.parentIdField]);
    }
    const result = client ? await client.query(sql, queryParams) : await query(sql, queryParams);
    return rowToDoc(result.rows[0]);
  }
  
  const sql = `
    INSERT INTO ${resolved.config.table} (${columnsToUpsert.join(', ')})
    VALUES (${placeholdersToUpsert.join(', ')})
    RETURNING id, payload
  `;
  
  try {
    const result = client ? await client.query(sql, valuesToUpsert) : await query(sql, valuesToUpsert);
    return rowToDoc(result.rows[0]);
  } catch (err) {
    throw formatDatabaseError(err, 'setDoc');
  }
}

async function getDoc(path) {
  const resolved = resolveDocumentPath(path);
  const row = await selectOne(null, resolved.config, resolved.id, resolved.parentIds);
  if (!row) return null;
  return rowToDoc(row);
}

async function setDoc(path, data, options = {}) {
  return withTransaction(async (client) => {
    return putDoc(client, path, data, options);
  });
}

async function updateDoc(path, patch) {
  return withTransaction(async (client) => {
    const resolved = resolveDocumentPath(path);
    const existingRow = await selectOne(client, resolved.config, resolved.id, resolved.parentIds);
    if (!existingRow) throw formatNotFoundError(resolved.collection, resolved.id);
    return putDoc(client, path, patch, { merge: true });
  });
}

async function deleteDoc(path) {
  const resolved = resolveDocumentPath(path);
  const params = [resolved.id];
  let sql = `DELETE FROM ${resolved.config.table} WHERE id = $1`;
  if (resolved.config.parentColumn) {
    params.push(resolved.parentIds[resolved.config.parentIdField]);
    sql += ` AND ${resolved.config.parentColumn} = $2`;
  }
  const result = await query(sql, params);
  return { deleted: result.rowCount > 0 };
}

module.exports = {
  resolveCollectionPath,
  resolveDocumentPath,
  selectOne,
  buildSetParams,
  putDoc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  assertSafeFieldName,
};