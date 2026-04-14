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

async function getDoc(user, path) {
  await assertAuthorized('getDoc', path, user, null);
  return await documentStore.getDoc(path);
}

async function setDoc(user, path, data, options = {}) {
  const auth = await assertAuthorized('setDoc', path, user, data || {});
  return await documentStore.setDoc(path, auth.payload || {}, options);
}

async function updateDoc(user, path, data) {
  const auth = await assertAuthorized('updateDoc', path, user, data || {});
  return await documentStore.updateDoc(path, auth.payload || {});
}

async function deleteDoc(user, path) {
  await assertAuthorized('deleteDoc', path, user, null);
  return await documentStore.deleteDoc(path);
}

async function queryCollection(path, constraints = {}, user = null) {
  // Pass user for authorization check
  await assertAuthorized('queryCollection', path, user, null);
  return await documentStore.queryCollection(path, constraints);
}

async function addDoc(user, path, data) {
  const auth = await assertAuthorized('addDoc', path, user, data || {});
  return await documentStore.addDoc(path, auth.payload || {});
}

async function runTransaction(user, actions = []) {
  const normalizedActions = [];
  for (const action of actions) {
    const auth = await assertAuthorized(action.op, action.path, user, action.data || null);
    normalizedActions.push(
      auth && auth.payload !== undefined
        ? Object.assign({}, action, { data: auth.payload })
        : action
    );
  }
  return await documentStore.runTransaction(normalizedActions);
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
    const doc = await getDoc(user, path);
    return { doc };
  }

  if (op === 'setDoc') {
    const doc = await setDoc(user, path, body.data || {}, body.options || {});
    return { doc };
  }

  if (op === 'updateDoc') {
    const doc = await updateDoc(user, path, body.data || {});
    return { doc };
  }

  if (op === 'deleteDoc') {
    return await deleteDoc(user, path);
  }

  if (op === 'queryCollection') {
    const docs = await queryCollection(path, body.constraints || {}, user);
    return { docs };
  }

  if (op === 'addDoc') {
    const doc = await addDoc(user, path, body.data || {});
    return { doc };
  }

  if (op === 'runTransaction') {
    const results = await runTransaction(user, body.actions);
    return { results };
  }

  throw httpError(400, `Unsupported op: ${op}`);
}

module.exports = {
  executeFirestoreApi,
  isAdminUser,
  assertAuthorized,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  queryCollection,
  addDoc,
  runTransaction
};