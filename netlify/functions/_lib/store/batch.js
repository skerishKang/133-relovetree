/**
 * Batch Processor - Transaction handling for multiple operations
 */
const crypto = require('crypto');
const { withTransaction } = require('../db');
const { httpError } = require('./error');
const { applyPatch, DELETE_SENTINEL } = require('./transform');
const { resolveDocumentPath, resolveCollectionPath, buildSetParams, putDoc, selectOne } = require('./crud');

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
      
      if (op === 'addDoc') {
        const { config, parentIds } = resolveCollectionPath(action.path);
        const id = crypto.randomUUID();
        const docPath =
          config.parentColumn && config.parentIdField
            ? `${config.parentCollection === 'trees' ? 'trees' : 'community_posts'}/${parentIds[config.parentIdField]}/${config.collection}/${id}`
            : `${config.collection}/${id}`;
        const saved = await putDoc(client, docPath, action.data || {}, { merge: false });
        results.push({ id, data: saved.data });
        continue;
      }
      
      throw httpError(400, `Unsupported transaction op: ${op}`);
    }
    
    return results;
  });
}

module.exports = {
  runTransaction,
};