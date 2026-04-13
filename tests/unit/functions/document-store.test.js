// Document Store server test - applyTransform / applyPatch coverage
const assert = require('assert');
const { applyTransform, applyPatch, DELETE_SENTINEL } = require('../../../netlify/functions/_lib/document-store');

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

  // 2. increment (initial & existing)
  test('increment transform (initial)', () => {
    const transform = { __firestoreTransform: true, type: 'increment', operand: 5 };
    const result = applyTransform(transform, undefined, nowIso);
    assert.strictEqual(result, 5);
  });
  test('increment transform (existing)', () => {
    const transform = { __firestoreTransform: true, type: 'increment', operand: 10 };
    const result = applyTransform(transform, 7, nowIso);
    assert.strictEqual(result, 17);
  });

  // 3. arrayUnion unique merge
  test('arrayUnion transform (unique merge)', () => {
    const transform = { __firestoreTransform: true, type: 'arrayUnion', values: [2, 3, 4] };
    const result = applyTransform(transform, [1, 2], nowIso);
    assert.deepStrictEqual(result, [1, 2, 3, 4]);
  });

  // 4. delete sentinel
  test('delete transform returns sentinel', () => {
    const transform = { __firestoreTransform: true, type: 'delete' };
    const result = applyTransform(transform, 'old', nowIso);
    assert.strictEqual(result, DELETE_SENTINEL);
  });

  // 5. nested patch merge
  test('nested patch merge', () => {
    const base = { profile: { name: 'Alice', age: 25 } };
    const patch = { profile: { age: 26, location: 'Seoul' } };
    const result = applyPatch(base, patch, nowIso);
    assert.deepStrictEqual(result, { profile: { name: 'Alice', age: 26, location: 'Seoul' } });
  });

  // Run all tests
  console.log('--- Running Document Store Transform Unit Tests ---');
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
runTests().catch(err => { console.error(err); process.exit(1); });
