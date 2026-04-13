const assert = require('assert');
const { applyTransform, applyPatch, DELETE_SENTINEL } = require('../../../netlify/functions/_lib/db-api');

/**
 * Backend Unit Test for document-store.js Transform Logic
 * 
 * Target: netlify/functions/_lib/document-store.js (via db-api.js export)
 */

async function runTests() {
  const tests = [];
  const test = (name, fn) => tests.push({ name, fn });

  const nowIso = new Date().toISOString();

  // 1. serverTimestamp
  test('serverTimestamp transform', () => {
    const transform = { __firestoreTransform: true, type: 'serverTimestamp' };
    const result = applyTransform(transform, undefined, nowIso);
    assert.strictEqual(result, nowIso);
  });

  // 2. increment
  test('increment transform (initial)', () => {
    const transform = { __firestoreTransform: true, type: 'increment', operand: 5 };
    const result = applyTransform(transform, undefined, nowIso);
    assert.strictEqual(result, 5);
  });

  test('increment transform (existing)', () => {
    const transform = { __firestoreTransform: true, type: 'increment', operand: 10 };
    const result = applyTransform(transform, 5, nowIso);
    assert.strictEqual(result, 15);
  });

  test('increment transform with negative operand', () => {
    const transform = { __firestoreTransform: true, type: 'increment', operand: -3 };
    const result = applyTransform(transform, 10, nowIso);
    assert.strictEqual(result, 7);
  });

  // 3. arrayUnion
  test('arrayUnion transform (unique merge)', () => {
    const transform = { __firestoreTransform: true, type: 'arrayUnion', values: [2, 3, 4] };
    const result = applyTransform(transform, [1, 2], nowIso);
    assert.deepStrictEqual(result, [1, 2, 3, 4]);
  });

  test('arrayUnion transform with duplicates (should dedupe)', () => {
    const transform = { __firestoreTransform: true, type: 'arrayUnion', values: [2, 3, 2] };
    const result = applyTransform(transform, [1, 2], nowIso);
    assert.ok(result.includes(1));
    assert.ok(result.includes(2));
    assert.ok(result.includes(3));
    assert.strictEqual(result.length, 3);
  });

  test('arrayUnion transform with objects (deep equality)', () => {
    const obj1 = { id: 1, name: 'Alice' };
    const obj2 = { id: 2, name: 'Bob' };
    const transform = { __firestoreTransform: true, type: 'arrayUnion', values: [obj2] };
    const result = applyTransform(transform, [obj1], nowIso);
    assert.deepStrictEqual(result, [obj1, obj2]);
  });

  // 4. delete transform
  test('delete transform should return DELETE_SENTINEL symbol', () => {
    const transform = { __firestoreTransform: true, type: 'delete' };
    const result = applyTransform(transform, 'oldValue', nowIso);
    assert.strictEqual(result, DELETE_SENTINEL);
  });

  // 5. applyPatch with delete
  test('applyPatch with delete operation', () => {
    const base = { a: 1, b: 2 };
    const patch = { b: { __firestoreTransform: true, type: 'delete' }, c: 3 };
    const result = applyPatch(base, patch, nowIso);
    assert.deepStrictEqual(result, { a: 1, c: 3 });
  });

  test('applyPatch with multiple deletes', () => {
    const base = { a: 1, b: 2, c: 3 };
    const patch = { 
      a: { __firestoreTransform: true, type: 'delete' }, 
      c: { __firestoreTransform: true, type: 'delete' },
      d: 4 
    };
    const result = applyPatch(base, patch, nowIso);
    assert.deepStrictEqual(result, { b: 2, d: 4 });
  });

  // 6. Nested patch merge
  test('nested patch merge', () => {
    const base = { profile: { name: 'Alice', age: 25 } };
    const patch = { profile: { age: 26, location: 'Seoul' } };
    const result = applyPatch(base, patch, nowIso);
    assert.deepStrictEqual(result, {
      profile: { name: 'Alice', age: 26, location: 'Seoul' }
    });
  });

  test('deep nested patch merge with transform', () => {
    const base = { 
      user: { 
        profile: { 
          name: 'Alice', 
          age: 25,
          stats: { views: 10 }
        } 
      } 
    };
    const patch = { 
      user: { 
        profile: { 
          age: 26, 
          stats: { views: { __firestoreTransform: true, type: 'increment', operand: 5 } }
        } 
      } 
    };
    const result = applyPatch(base, patch, nowIso);
    assert.deepStrictEqual(result, {
      user: {
        profile: {
          name: 'Alice',
          age: 26,
          stats: { views: 15 }
        }
      }
    });
  });

  // 7. Mixed transforms in patch
  test('mixed transforms in patch', () => {
    const base = { stats: { views: 10 }, tags: ['old'], updated: null };
    const patch = {
      stats: { views: { __firestoreTransform: true, type: 'increment', operand: 1 } },
      tags: { __firestoreTransform: true, type: 'arrayUnion', values: ['new'] },
      updated: { __firestoreTransform: true, type: 'serverTimestamp' }
    };
    const result = applyPatch(base, patch, nowIso);
    assert.strictEqual(result.stats.views, 11);
    assert.deepStrictEqual(result.tags, ['old', 'new']);
    assert.strictEqual(result.updated, nowIso);
  });

  // 8. Edge cases
  test('applyPatch with undefined base', () => {
    const patch = { a: 1, b: { __firestoreTransform: true, type: 'delete' } };
    const result = applyPatch(undefined, patch, nowIso);
    assert.deepStrictEqual(result, { a: 1 });
  });

  test('applyPatch with null values', () => {
    const base = { a: null, b: 2 };
    const patch = { a: 1, b: { __firestoreTransform: true, type: 'delete' } };
    const result = applyPatch(base, patch, nowIso);
    assert.deepStrictEqual(result, { a: 1 });
  });

  test('applyTransform with unknown transform type', () => {
    const transform = { __firestoreTransform: true, type: 'unknown' };
    const result = applyTransform(transform, 'test', nowIso);
    assert.strictEqual(result, 'test');
  });

  test('arrayUnion with non-array values', () => {
    const transform = { __firestoreTransform: true, type: 'arrayUnion', values: 'not an array' };
    const result = applyTransform(transform, [1, 2], nowIso);
    assert.deepStrictEqual(result, [1, 2]);
  });

  test('increment with non-numeric operand', () => {
    const transform = { __firestoreTransform: true, type: 'increment', operand: '5' };
    const result = applyTransform(transform, 10, nowIso);
    assert.strictEqual(result, 15);
  });

  // Run all
  console.log('--- Running Backend Document Store Unit Tests ---');
  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      t.fn();
      console.log(`✅ [PASS] ${t.name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${t.name}`);
      console.error(err);
      failed++;
    }
  }

  console.log('--------------------------------------------------');
  console.log(`Summary: ${passed} passed, ${failed} failed`);

  if (failed > 0) process.exit(1);
}
runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
