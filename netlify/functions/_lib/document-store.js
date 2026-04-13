/**
 * ⚠️ CORE DATA LAYER - Lovetree PostgreSQL Document Store
 * 
 * This is the ONLY file that writes SQL to Neon/PostgreSQL.
 * All Firestore-style transforms (increment, serverTimestamp, arrayUnion, delete)
 * are processed HERE into actual SQL values before persisting.
 * 
 * Architecture (full data path):
 *   Browser → postgres-client-browser.js → firebase-firestore-compat.js (shim)
 *     → /api/firestore → firestore-api.js → [THIS FILE] → Neon/PostgreSQL
 * 
 * Transform flow:
 *   Client calls FieldValue.increment(1)
 *     → shim converts to {__firestoreTransform: true, type: 'increment', operand: 1}
 *     → this file's applyTransform() converts to: currentValue + operand
 *   Client calls FieldValue.serverTimestamp()
 *     → shim converts to {__firestoreTransform: true, type: 'serverTimestamp'}
 *     → this file's applyTransform() converts to: nowIso (current server time)
 * 
 * For new server code, use the official entry point:
 *   const { queryPostgresCollection, getPostgresDoc } = require('./db-api');
 * 
 * DO NOT reference this file directly from Netlify Functions.
 * Use db-api.js as the public interface.
 */
const crypto = require('crypto');
const { query, withTransaction } = require('./db');
const { httpError } = require('./http');

const DELETE_SENTINEL = Symbol('delete_field');

const TABLE_CONFIG = {
  users: {
    table: 'users',
    collection: 'users',
    fields: {
      email: { column: 'email', type: 'text' },
      displayName: { column: 'display_name', type: 'text' },
      photoURL: { column: 'photo_url', type: 'text' },
      role: { column: 'role', type: 'text' },
      isDemo: { column: 'is_demo', type: 'boolean' },
      isAiBot: { column: 'is_ai_bot', type: 'boolean' },
      isPro: { column: 'is_pro', type: 'boolean' },
      createdAt: { column: 'created_at', type: 'timestamptz' },
      lastLogin: { column: 'last_login', type: 'timestamptz' },
      updatedAt: { column: 'updated_at', type: 'timestamptz' },
      userId: { column: 'external_user_id', type: 'text' },
    },
  },
  trees: {
    table: 'trees',
    collection: 'trees',
    fields: {
      name: { column: 'name', type: 'text' },
      ownerId: { column: 'owner_id', type: 'text' },
      isDemo: { column: 'is_demo', type: 'boolean' },
      isAiBot: { column: 'is_ai_bot', type: 'boolean' },
      nodeCount: { column: 'node_count', type: 'number' },
      viewCount: { column: 'view_count', type: 'number' },
      likeCount: { column: 'like_count', type: 'number' },
      shareCount: { column: 'share_count', type: 'number' },
      lastUpdated: { column: 'last_updated', type: 'timestamptz' },
      lastOpened: { column: 'last_opened', type: 'timestamptz' },
      createdAt: { column: 'created_at', type: 'timestamptz' },
      updatedAt: { column: 'updated_at', type: 'timestamptz' },
    },
  },
  tree_comments: {
    table: 'tree_comments',
    collection: 'comments',
    parentCollection: 'trees',
    parentIdField: 'treeId',
    parentColumn: 'tree_id',
    fields: {
      authorId: { column: 'author_id', type: 'text' },
      authorDisplayName: { column: 'author_display_name', type: 'text' },
      createdAt: { column: 'created_at', type: 'timestamptz' },
      updatedAt: { column: 'updated_at', type: 'timestamptz' },
      isDeleted: { column: 'is_deleted', type: 'boolean' },
    },
  },
  community_posts: {
    table: 'community_posts',
    collection: 'community_posts',
    fields: {
      authorId: { column: 'author_id', type: 'text' },
      authorDisplayName: { column: 'author_display_name', type: 'text' },
      title: { column: 'title', type: 'text' },
      treeId: { column: 'tree_id', type: 'text' },
      commentCount: { column: 'comment_count', type: 'number' },
      isDeleted: { column: 'is_deleted', type: 'boolean' },
      createdAt: { column: 'created_at', type: 'timestamptz' },
      updatedAt: { column: 'updated_at', type: 'timestamptz' },
      deletedAt: { column: 'deleted_at', type: 'timestamptz' },
    },
  },
  community_comments: {
    table: 'community_comments',
    collection: 'comments',
    parentCollection: 'community_posts',
    parentIdField: 'postId',
    parentColumn: 'post_id',
    fields: {
      authorId: { column: 'author_id', type: 'text' },
      authorDisplayName: { column: 'author_display_name', type: 'text' },
      createdAt: { column: 'created_at', type: 'timestamptz' },
      updatedAt: { column: 'updated_at', type: 'timestamptz' },
      isDeleted: { column: 'is_deleted', type: 'boolean' },
      deletedAt: { column: 'deleted_at', type: 'timestamptz' },
    },
  },
  ai_logs: {
    table: 'ai_logs',
    collection: 'ai_logs',
    fields: {
      userId: { column: 'user_id', type: 'text' },
      treeId: { column: 'tree_id', type: 'text' },
      mode: { column: 'mode', type: 'text' },
      createdAt: { column: 'created_at', type: 'timestamptz' },
    },
  },
  community_moderation_logs: {
    table: 'community_moderation_logs',
    collection: 'community_moderation_logs',
    fields: {
      actorUid: { column: 'actor_uid', type: 'text' },
      eventType: { column: 'event_type', type: 'text' },
      createdAt: { column: 'created_at', type: 'timestamptz' },
    },
  },
};

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function isTransform(value) {
  return isPlainObject(value) && value.__firestoreTransform === true;
}

function applyTransform(transform, currentValue, nowIso) {
  switch (transform.type) {
    case 'serverTimestamp':
      return nowIso;
    case 'increment':
      return Number(currentValue || 0) + Number(transform.operand || 0);
    case 'arrayUnion': {
      const current = Array.isArray(currentValue) ? currentValue.slice() : [];
      const seen = new Set(current.map((item) => JSON.stringify(item)));
      const values = Array.isArray(transform.values) ? transform.values : [];
      values.forEach((item) => {
        const key = JSON.stringify(item);
        if (!seen.has(key)) {
          current.push(item);
          seen.add(key);
        }
      });
      return current;
    }
    case 'delete':
      return DELETE_SENTINEL;
    default:
      return currentValue;
  }
}

function applyPatch(base, patch, nowIso) {
  const target = isPlainObject(base) ? clone(base) : {};
  Object.entries(patch || {}).forEach(([key, value]) => {
    if (isTransform(value)) {
      const nextValue = applyTransform(value, target[key], nowIso);
      if (nextValue === DELETE_SENTINEL) delete target[key];
      else target[key] = nextValue;
      return;
    }

    if (Array.isArray(value)) {
      target[key] = clone(value);
      return;
    }

    if (isPlainObject(value)) {
      const existing = isPlainObject(target[key]) ? target[key] : {};
      target[key] = applyPatch(existing, value, nowIso);
      return;
    }

    target[key] = value;
  });
  return target;
}

function normalizeDateValue(value) {
  if (value == null || value === '') return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function coerceColumnValue(type, value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  switch (type) {
    case 'boolean':
      return Boolean(value);
    case 'number':
      return Number(value || 0);
    case 'timestamptz':
      return normalizeDateValue(value);
    default:
      return String(value);
  }
}

function getConfigByTableName(tableName) {
  const item = Object.values(TABLE_CONFIG).find((entry) => entry.table === tableName);
  if (!item) throw new Error(`Unsupported table ${tableName}`);
  return item;
}

function assertSafeFieldName(fieldName) {
  if (!/^[A-Za-z0-9_]+$/.test(String(fieldName || ''))) {
    throw httpError(400, `Unsupported field name: ${fieldName}`);
  }
}

function resolveCollectionPath(path) {
  const segments = String(path || '')
    .split('/')
    .map((item) => item.trim())
    .filter(Boolean);

  if (segments.length === 1) {
    const topLevel = Object.values(TABLE_CONFIG).find(
      (entry) => entry.parentCollection == null && entry.collection === segments[0]
    );
    if (!topLevel) throw httpError(400, `Unsupported collection path: ${path}`);
    return { config: topLevel, parentIds: {} };
  }

  if (segments.length === 3 && segments[0] === 'trees' && segments[2] === 'comments') {
    return {
      config: TABLE_CONFIG.tree_comments,
      parentIds: { treeId: segments[1] },
    };
  }

  if (
    segments.length === 3 &&
    segments[0] === 'community_posts' &&
    segments[2] === 'comments'
  ) {
    return {
      config: TABLE_CONFIG.community_comments,
      parentIds: { postId: segments[1] },
    };
  }

  throw httpError(400, `Unsupported collection path: ${path}`);
}

function resolveDocumentPath(path) {
  const segments = String(path || '')
    .split('/')
    .map((item) => item.trim())
    .filter(Boolean);

  if (segments.length === 2) {
    const { config } = resolveCollectionPath(segments[0]);
    return { config, id: segments[1], parentIds: {} };
  }

  if (segments.length === 4 && segments[0] === 'trees' && segments[2] === 'comments') {
    return {
      config: TABLE_CONFIG.tree_comments,
      id: segments[3],
      parentIds: { treeId: segments[1] },
    };
  }

  if (
    segments.length === 4 &&
    segments[0] === 'community_posts' &&
    segments[2] === 'comments'
  ) {
    return {
      config: TABLE_CONFIG.community_comments,
      id: segments[3],
      parentIds: { postId: segments[1] },
    };
  }

  throw httpError(400, `Unsupported document path: ${path}`);
}

function buildWritePayload(config, id, parentIds, data) {
  const payload = clone(data || {});
  const columns = { id, payload };

  if (config.parentColumn && config.parentIdField) {
    columns[config.parentColumn] = parentIds[config.parentIdField] || null;
  }

  Object.entries(config.fields || {}).forEach(([fieldName, meta]) => {
    const rawValue = payload[fieldName];
    const coerced =
      rawValue === undefined ? null : coerceColumnValue(meta.type, rawValue);
    columns[meta.column] = coerced;
  });

  return columns;
}

async function selectOne(client, config, id, parentIds) {
  const params = [id];
  const where = ['id = $1'];

  if (config.parentColumn && config.parentIdField) {
    params.push(parentIds[config.parentIdField]);
    where.push(`${config.parentColumn} = $${params.length}`);
  }

  const result = await client.query(
    `SELECT id, payload FROM ${config.table} WHERE ${where.join(' AND ')} LIMIT 1`,
    params
  );
  return result.rows[0] || null;
}

function rowToDoc(row) {
  if (!row) return null;
  return {
    id: row.id,
    data: clone(row.payload || {}),
  };
}

function getConflictTarget(config) {
  if (config.parentColumn) {
    return `(${config.parentColumn}, id)`;
  }
  return '(id)';
}

async function getDoc(path) {
  const resolved = resolveDocumentPath(path);
  const result = await query(
    `SELECT id, payload FROM ${resolved.config.table}
     WHERE id = $1${
       resolved.config.parentColumn ? ` AND ${resolved.config.parentColumn} = $2` : ''
     }
     LIMIT 1`,
    resolved.config.parentColumn
      ? [resolved.id, resolved.parentIds[resolved.config.parentIdField]]
      : [resolved.id]
  );
  return rowToDoc(result.rows[0] || null);
}

async function putDoc(client, path, incomingData, options) {
  const resolved = resolveDocumentPath(path);
  const existingRow = await selectOne(client, resolved.config, resolved.id, resolved.parentIds);
  const existing = existingRow ? existingRow.payload || {} : {};
  const nowIso = new Date().toISOString();
  const merge = !!(options && options.merge);
  const nextData = merge ? applyPatch(existing, incomingData, nowIso) : applyPatch({}, incomingData, nowIso);
  const writePayload = buildWritePayload(
    resolved.config,
    resolved.id,
    resolved.parentIds,
    nextData
  );

  const keys = Object.keys(writePayload);
  const values = keys.map((key) => (key === 'payload' ? JSON.stringify(writePayload[key]) : writePayload[key]));
  const updateClause = keys
    .filter((key) => key !== 'id')
    .map((key) => `${key} = EXCLUDED.${key}`)
    .join(', ');

  await client.query(
    `INSERT INTO ${resolved.config.table} (${keys.join(', ')})
     VALUES (${keys.map((_, index) => `$${index + 1}`).join(', ')})
     ON CONFLICT ${getConflictTarget(resolved.config)} DO UPDATE SET ${updateClause}`,
    values
  );

  return { id: resolved.id, data: nextData };
}

async function setDoc(path, data, options) {
  return withTransaction((client) => putDoc(client, path, data, options));
}

async function updateDoc(path, patch) {
  return withTransaction(async (client) => {
    const resolved = resolveDocumentPath(path);
    const existingRow = await selectOne(client, resolved.config, resolved.id, resolved.parentIds);
    if (!existingRow) throw httpError(404, 'Document not found');
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

function buildWhereClause(config, constraints, params) {
  const clauses = [];
  (constraints || []).forEach((constraint) => {
    const field = String(constraint.field || '');
    const op = String(constraint.op || '==');
    const value = constraint.value;
    const meta = config.fields[field];
    assertSafeFieldName(field);

    const left = meta ? meta.column : `payload ->> $${params.push(field)}`;

    if (op === '==') {
      params.push(meta && meta.type === 'boolean' ? Boolean(value) : value);
      clauses.push(`${left} = $${params.length}`);
      return;
    }

    if (op === '!=') {
      params.push(meta && meta.type === 'boolean' ? Boolean(value) : value);
      clauses.push(`${left} <> $${params.length}`);
      return;
    }

    if (['<', '<=', '>', '>='].includes(op) && meta) {
      params.push(value);
      clauses.push(`${left} ${op} $${params.length}`);
      return;
    }

    if (op === 'array-contains') {
      params.push(JSON.stringify([value]));
      clauses.push(`COALESCE(payload -> '${field}', '[]'::jsonb) @> $${params.length}::jsonb`);
      return;
    }

    throw httpError(400, `Unsupported query operator: ${op}`);
  });
  return clauses;
}

async function queryCollection(path, constraints) {
  const resolved = resolveCollectionPath(path);
  const params = [];
  const where = [];

  if (resolved.config.parentColumn && resolved.config.parentIdField) {
    params.push(resolved.parentIds[resolved.config.parentIdField]);
    where.push(`${resolved.config.parentColumn} = $${params.length}`);
  }

  where.push(...buildWhereClause(resolved.config, constraints && constraints.where, params));

  let sql = `SELECT id, payload FROM ${resolved.config.table}`;
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;

  const orderBy = Array.isArray(constraints && constraints.orderBy)
    ? constraints.orderBy
    : [];
  if (orderBy.length) {
    const pieces = orderBy.map((item) => {
      const field = String(item.field || '');
      assertSafeFieldName(field);
      const direction = String(item.direction || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      const meta = resolved.config.fields[field];
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
  return result.rows.map((row) => rowToDoc(row));
}

async function addDoc(path, data) {
  const { config, parentIds } = resolveCollectionPath(path);
  const id = crypto.randomUUID();
  const docPath =
    config.parentColumn && config.parentIdField
      ? `${config.parentCollection === 'trees' ? 'trees' : 'community_posts'}/${parentIds[config.parentIdField]}/${config.collection}/${id}`
      : `${config.collection}/${id}`;
  const saved = await setDoc(docPath, data, { merge: false });
  return { id, data: saved.data };
}

async function runTransaction(actions) {
  return withTransaction(async (client) => {
    const results = [];
    for (const action of actions || []) {
      const op = String(action.op || '');
      if (op === 'setDoc') {
        results.push(await putDoc(client, action.path, action.data || {}, action.options || {}));
        continue;
      }
      if (op === 'updateDoc') {
        const resolved = resolveDocumentPath(action.path);
        const existing = await selectOne(client, resolved.config, resolved.id, resolved.parentIds);
        if (!existing) throw httpError(404, 'Document not found');
        results.push(await putDoc(client, action.path, action.data || {}, { merge: true }));
        continue;
      }
      if (op === 'deleteDoc') {
        const resolved = resolveDocumentPath(action.path);
        const params = [resolved.id];
        let sql = `DELETE FROM ${resolved.config.table} WHERE id = $1`;
        if (resolved.config.parentColumn) {
          params.push(resolved.parentIds[resolved.config.parentIdField]);
          sql += ` AND ${resolved.config.parentColumn} = $2`;
        }
        await client.query(sql, params);
        results.push({ ok: true });
        continue;
      }
      throw httpError(400, `Unsupported transaction op: ${op}`);
    }
    return results;
  });
}

async function getUserRole(uid) {
  if (!uid) return null;
  const doc = await getDoc(`users/${uid}`);
  return doc && doc.data ? doc.data.role || null : null;
}

module.exports = {
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  queryCollection,
  addDoc,
  runTransaction,
  getUserRole,
  TABLE_CONFIG,
  getConfigByTableName,
};
