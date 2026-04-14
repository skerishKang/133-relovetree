/**
 * ⚠️ LEGACY INTERNAL SHIM - Firestore API Handler
 * 
 * DO NOT USE as primary entry point for new server code.
 * Use: /netlify/functions/_lib/db-api.js instead
 * 
 * This handles Firestore-style API but stores data in PostgreSQL!
 * 
 * Architecture:
 *   Client (via firebase-firestore-compat.js) → POST /api/firestore → This Handler → PostgreSQL
 * 
 * This file is now a thin wrapper that delegates to modular sub-components.
 */
const { getUserFromEvent } = require('./firebase-auth');
const { httpError } = require('./http');
const documentStore = require('./document-store');
const { isAdminUser } = require('./api/auth');
const { 
  getPathRoot, 
  getPathSegments, 
  isDocumentPath, 
  isWriteOp, 
  isPublicTreeCounterMutation,
  getCommentAuthorId,
  normalizeCommentPayload,
  sanitizeSelfUserPayload 
} = require('./api/validation');

async function safeGetExisting(path) {
  try {
    return await documentStore.getDoc(path);
  } catch (error) {
    if (error && typeof error.status === 'number') {
      throw error;
    }
    throw httpError(503, 'Failed to verify existing document');
  }
}

async function assertAuthorized(op, path, user, payload) {
  const root = getPathRoot(path);
  const isAdmin = await isAdminUser(user);
  const doc = isDocumentPath(path) ? await safeGetExisting(path) : null;
  const existing = doc && doc.data ? doc.data : null;
  const normalizedPayload = isWriteOp(op)
    ? normalizeCommentPayload(root, path, payload, existing)
    : payload;
  const segments = getPathSegments(path);
  const isTreeCommentsCollection =
    root === 'trees' &&
    segments.length === 3 &&
    segments[2] === 'comments';
  const isCommunityCommentsCollection =
    root === 'community_posts' &&
    segments.length === 3 &&
    segments[2] === 'comments';

  if (op === 'queryCollection' || op === 'getDoc') {
    if (root === 'users') {
      if (path.includes('/')) {
        const targetUid = segments[1];
        if (user && user.uid === targetUid) return { isAdmin };
      }
      if (!isAdmin) throw httpError(403, 'Forbidden');
    }
    if (root === 'ai_logs' || root === 'community_moderation_logs') {
      if (!isAdmin) throw httpError(403, 'Forbidden');
    }
    return { isAdmin };
  }

  if (!user && root === 'trees' && isPublicTreeCounterMutation(payload)) {
    return { isAdmin: false };
  }

  if (!user) throw httpError(401, 'Authentication required');

  if (root === 'users') {
    if (op === 'addDoc' && !isAdmin) {
      throw httpError(403, 'Forbidden');
    }

    const targetUid = segments[1];
    if (!isAdmin && user.uid !== targetUid) throw httpError(403, 'Forbidden');
  }

  if (op === 'setDoc' || op === 'updateDoc') {
    if (isAdmin) return { isAdmin, payload: normalizedPayload };
    return {
      isAdmin: false,
      payload: sanitizeSelfUserPayload(normalizedPayload, existing, user),
    };
  }

  if (root === 'trees') {
    if (path.includes('/comments/') || isTreeCommentsCollection) {
      const authorId = getCommentAuthorId(normalizedPayload, existing, user.uid);
      if (!isAdmin && authorId && authorId !== user.uid) throw httpError(403, 'Forbidden');
      return { isAdmin, payload: normalizedPayload };
    }

    const ownerId =
      (normalizedPayload && normalizedPayload.ownerId) ||
      (existing && existing.ownerId) ||
      user.uid;
    if (!isAdmin && ownerId !== user.uid) throw httpError(403, 'Forbidden');
    return { isAdmin, payload: normalizedPayload };
  }

  if (root === 'community_posts') {
    if (path.includes('/comments/') || isCommunityCommentsCollection) {
      const authorId = getCommentAuthorId(normalizedPayload, existing, user.uid);
      if (!isAdmin && authorId !== user.uid) throw httpError(403, 'Forbidden');
      return { isAdmin, payload: normalizedPayload };
    }

    const authorId =
      (normalizedPayload && normalizedPayload.authorId) ||
      (existing && existing.authorId) ||
      user.uid;
    if (!isAdmin && authorId !== user.uid) throw httpError(403, 'Forbidden');
    return { isAdmin, payload: normalizedPayload };
  }

  if (root === 'ai_logs' || root === 'community_moderation_logs') {
    if (!isAdmin) throw httpError(403, 'Forbidden');
    return { isAdmin, payload: normalizedPayload };
  }

  throw httpError(400, 'Unsupported collection');
}

async function executeFirestoreApi(event, body) {
  const user = await getUserFromEvent(event);
  const op = String(body && body.op ? body.op : '');
  const path = String(body && body.path ? body.path : '');
  
  const pathRoot = path.split('/')[1] || '';
  console.log('[FIRESTORE-API]', JSON.stringify({
    op,
    pathRoot,
    hasUser: !!user,
    userUid: user?.uid?.substring(0, 8) + '...'
  }));

  if (!op) throw httpError(400, 'op is required');
  if (!path && op !== 'runTransaction') throw httpError(400, 'path is required');

  if (op === 'getDoc') {
    await assertAuthorized(op, path, user, null);
    const doc = await documentStore.getDoc(path);
    return { doc };
  }

  if (op === 'setDoc') {
    const auth = await assertAuthorized(op, path, user, body.data || {});
    const doc = await documentStore.setDoc(path, auth.payload || {}, body.options || {});
    return { doc };
  }

  if (op === 'updateDoc') {
    const auth = await assertAuthorized(op, path, user, body.data || {});
    const doc = await documentStore.updateDoc(path, auth.payload || {});
    return { doc };
  }

  if (op === 'deleteDoc') {
    await assertAuthorized(op, path, user, null);
    return await documentStore.deleteDoc(path);
  }

  if (op === 'queryCollection') {
    await assertAuthorized(op, path, user, null);
    const docs = await documentStore.queryCollection(path, body.constraints || {});
    return { docs };
  }

  if (op === 'addDoc') {
    const auth = await assertAuthorized(op, path, user, body.data || {});
    const doc = await documentStore.addDoc(path, auth.payload || {});
    return { doc };
  }

  if (op === 'runTransaction') {
    const actions = Array.isArray(body.actions) ? body.actions : [];
    const normalizedActions = [];
    for (const action of actions) {
      const auth = await assertAuthorized(action.op, action.path, user, action.data || null);
      normalizedActions.push(
        auth && auth.payload !== undefined
          ? Object.assign({}, action, { data: auth.payload })
          : action
      );
    }
    const results = await documentStore.runTransaction(normalizedActions);
    return { results };
  }

  throw httpError(400, `Unsupported op: ${op}`);
}

module.exports = {
  executeFirestoreApi,
  isAdminUser,
};