/**
 * Transform Helpers - Firestore FieldValue transformations
 */

const DELETE_SENTINEL = Symbol('delete_field');

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
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function convertFirestoreToPostgres(collection, data, nowIso) {
  if (!data || typeof data !== 'object') return data;
  return applyPatch({}, data, nowIso);
}

module.exports = {
  DELETE_SENTINEL,
  isPlainObject,
  clone,
  isTransform,
  applyTransform,
  applyPatch,
  normalizeDateValue,
  convertFirestoreToPostgres,
};