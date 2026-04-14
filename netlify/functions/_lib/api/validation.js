/**
 * Validation Helpers - Path and operation validation
 */

const { isPlainObject, cloneValue } = require('../store/transform');

function getPathRoot(path) {
  const segments = String(path || '')
    .split('/')
    .filter(Boolean);
  return segments[0] || '';
}

function getPathSegments(path) {
  return String(path || '')
    .split('/')
    .filter(Boolean);
}

function isDocumentPath(path) {
  return getPathSegments(path).length % 2 === 0;
}

function isWriteOp(op) {
  return op === 'setDoc' || op === 'updateDoc' || 'addDoc';
}

function isPublicTreeCounterMutation(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  const keys = Object.keys(payload);
  if (!keys.length) return false;
  const allowed = new Set(['viewCount', 'shareCount', 'lastOpened']);
  return keys.every((key) => allowed.has(key));
}

function getCommentAuthorId(payload, existing, fallbackUid) {
  return (
    (payload && (payload.authorId || payload.userId)) ||
    (existing && (existing.authorId || existing.userId)) ||
    fallbackUid ||
    ''
  );
}

function normalizeCommentPayload(root, path, payload, existing) {
  if (!isPlainObject(payload)) return payload;

  const segments = getPathSegments(path);
  const isTreeComments =
    root === 'trees' &&
    ((segments.length === 3 && segments[2] === 'comments') ||
      (segments.length === 4 && segments[2] === 'comments'));
  const isCommunityComments =
    root === 'community_posts' &&
    ((segments.length === 3 && segments[2] === 'comments') ||
      (segments.length === 4 && segments[2] === 'comments'));

  if (!isTreeComments && !isCommunityComments) return payload;

  const next = Object.assign({}, payload);
  const authorId =
    next.authorId || next.userId || (existing && (existing.authorId || existing.userId)) || '';
  const authorDisplayName =
    next.authorDisplayName ||
    next.userName ||
    (existing && (existing.authorDisplayName || existing.userName)) ||
    '';

  if (authorId) {
    next.authorId = authorId;
    if (isTreeComments && !Object.prototype.hasOwnProperty.call(next, 'userId')) {
      next.userId = authorId;
    }
  }

  if (authorDisplayName) {
    next.authorDisplayName = authorDisplayName;
    if (isTreeComments && !Object.prototype.hasOwnProperty.call(next, 'userName')) {
      next.userName = authorDisplayName;
    }
  }

  return next;
}

const SELF_MUTABLE_USER_FIELDS = new Set([
  'displayName',
  'photoURL',
  'createdAt',
  'lastLogin',
  'updatedAt',
]);

function sanitizeSelfUserPayload(payload, existing, user) {
  const input = isPlainObject(payload) ? payload : {};
  const next = isPlainObject(existing) ? cloneValue(existing) : {};

  if (!Object.prototype.hasOwnProperty.call(next, 'role')) next.role = 'free';
  if (!Object.prototype.hasOwnProperty.call(next, 'isDemo')) next.isDemo = false;
  if (!Object.prototype.hasOwnProperty.call(next, 'isAiBot')) next.isAiBot = false;
  if (!Object.prototype.hasOwnProperty.call(next, 'isPro')) next.isPro = false;

  if (user && typeof user.email === 'string' && user.email) {
    next.email = user.email;
  }

  SELF_MUTABLE_USER_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      next[field] = input[field];
    }
  });

  return next;
}

module.exports = {
  getPathRoot,
  getPathSegments,
  isDocumentPath,
  isWriteOp,
  isPublicTreeCounterMutation,
  getCommentAuthorId,
  normalizeCommentPayload,
  sanitizeSelfUserPayload,
  SELF_MUTABLE_USER_FIELDS,
};