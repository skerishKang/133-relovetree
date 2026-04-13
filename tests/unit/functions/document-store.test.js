const assert = require('assert');
const { applyTransform, applyPatch } = require('../../../netlify/functions/_lib/db-api');

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

  // 3. arrayUnion
  test('arrayUnion transform (unique merge)', () => {
    const transform = { __firestoreTransform: true, type: 'arrayUnion', values: [2, 3, 4] };
    const result = applyTransform(transform, [1, 2], nowIso);
    assert.deepStrictEqual(result, [1, 2, 3, 4]);
  });

  // 4. delete (Symbol) - Internal check
  test('delete transform', () => {
    // Note: applyTransform returns a Symbol for delete
    const transform = { __firestoreTransform: true, type: 'delete' };
    const result = applyTransform(transform, 'oldValue', nowIso);
    assert.strictEqual(typeof result, 'symbol');
  });

  // 5. applyPatch with delete
  test('applyPatch with delete operation', () => {
    const base = { a: 1, b: 2 };
    const patch = { b: { __firestoreTransform: true, type: 'delete' }, c: 3 };
    const result = applyPatch(base, patch, nowIso);
    assert.deepStrictEqual(result, { a: 1, c: 3 });
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
