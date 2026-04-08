const { buildResponse, handleError, httpError, noContent } = require('./_lib/http');
const { requireUser } = require('./_lib/firebase-auth');
const { isAdminUser } = require('./_lib/firestore-api');
const treeRepository = require('./_lib/repositories/tree-repository');

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return noContent();
  }

  try {
    const user = await requireUser(event);
    if (!(await isAdminUser(user))) {
      throw httpError(403, 'Forbidden');
    }

    const functionBasePath = '/.netlify/functions/tree-admin';
    const apiBasePath = '/api/admin/trees';

    let pathTail = event.path || '';

    if (pathTail.startsWith(functionBasePath)) {
      pathTail = pathTail.slice(functionBasePath.length);
    } else if (pathTail.startsWith(apiBasePath)) {
      pathTail = pathTail.slice(apiBasePath.length);
    }

    if (pathTail.startsWith('/')) {
      pathTail = pathTail.slice(1);
    }

    const segments = pathTail.split('/').filter(Boolean);
    const treeId = segments[0] || null;

    const qs = event.queryStringParameters || {};

    if (event.httpMethod === 'GET' && !treeId) {
      const limitRaw = qs.limit;
      const limit = Math.max(1, Math.min(100, Number(limitRaw) || 50));
      const ownerId = qs.ownerId || null;
      const items = await treeRepository.listTrees({ limit, ownerId });

      return buildResponse(200, { items });
    }

    if (event.httpMethod === 'GET' && treeId) {
      const doc = await treeRepository.getTree(treeId);
      if (!doc) {
        return buildResponse(404, { error: 'Tree not found' });
      }
      return buildResponse(200, { id: doc.id, ...(doc.data || {}) });
    }

    if (event.httpMethod === 'PATCH' && treeId) {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch (e) {
        return buildResponse(400, { error: 'Invalid JSON body' });
      }

      if (!body || typeof body !== 'object') {
        return buildResponse(400, { error: 'Request body must be JSON object' });
      }

      const allowedKeys = new Set([
        'name',
        'nodes',
        'edges',
        'likes',
        'comments',
        'nodeCount',
        'viewCount',
        'likeCount',
        'shareCount',
        'lastUpdated',
        'lastOpened',
        'ownerId',
        'isDemo',
        'isAiBot',
      ]);

      const updates = {};
      // eslint-disable-next-line no-restricted-syntax
      for (const [key, value] of Object.entries(body)) {
        if (!allowedKeys.has(key)) continue;

        if (
          (key === 'nodes' || key === 'edges' || key === 'likes' || key === 'comments') &&
          !Array.isArray(value)
        ) {
          return buildResponse(400, { error: `${key} must be an array` });
        }

        updates[key] = value;
      }

      if (!Object.keys(updates).length) {
        return buildResponse(400, { error: 'No valid fields to update' });
      }

      await treeRepository.updateTree(treeId, updates);
      return buildResponse(200, { ok: true });
    }

    return buildResponse(405, { error: 'Method not allowed' });
  } catch (err) {
    return handleError('tree-admin', err, requestOrigin);
  }
};
