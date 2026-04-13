import { test, expect } from '@playwright/test';

/**
 * Editor FieldValue Verification Tests
 * 
 * Two layers of verification:
 * 
 * A) Source pattern presence (Tests 1-4):
 *    - Confirms FieldValue.increment / serverTimestamp calls exist in source.
 *    - Does NOT verify runtime transformation or server-side processing.
 *    - Purpose: catch accidental removal of FieldValue usage during refactoring.
 * 
 * B) Shim runtime transform (Tests 6-9):
 *    - Loads firebase-firestore-compat.js in the editor page context.
 *    - Calls FieldValue factory methods and inspects return values.
 *    - Verifies the shim produces {__firestoreTransform: true, ...} objects.
 *    - Does NOT verify server-side applyTransform() in document-store.js.
 * 
 * Shared dependency:
 *    - All tests depend on shared layer: firebase-firestore-compat.js
 *    - If shared layer is modified, both editor-smoke.spec.js and this file
 *      must be re-run (per EDITOR_ARCHITECTURE.md §7.1).
 */

test.describe('Editor FieldValue Shim Verification', () => {
    
    let firestoreRequests = [];

    test.beforeEach(async ({ page }) => {
        firestoreRequests = [];

        // Capture all /api/firestore requests
        await page.route('**/api/firestore', async route => {
            const request = route.request();
            try {
                const postData = JSON.parse(request.postData() || '{}');
                firestoreRequests.push({
                    url: request.url(),
                    method: postData.method,
                    path: postData.path,
                    data: postData.data
                });
            } catch (e) {
                // Invalid JSON, skip
            }
            
            // Provide mock response for tree data
            // This simulates the tree existing with some viewCount
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    doc: {
                        id: 'test-tree',
                        exists: true,
                        data: {
                            id: 'test-tree',
                            name: '테스트 트리',
                            ownerId: 'user-123',
                            nodes: [{ id: 1, title: '첫 번째 노드' }],
                            viewCount: 10,
                            shareCount: 5,
                            lastOpened: '2026-04-13T00:00:00.000Z'
                        }
                    }
                })
            });
        });

        // Log all captured requests for debugging
        page.on('request', req => {
            if (req.url().includes('api/firestore')) {
                console.log('[DEBUG] Firestore API called:', req.url());
            }
        });
    });

    /**
     * [Source Pattern] Test 1: viewCount increment on editor load
     * File: src/editor-data.js — uses FieldValue.increment(1)
     * Scope: source code string pattern only, not runtime transform output
     */
    test('viewCount increment - FieldValue.increment(1) call exists in editor-data.js', async ({ page, baseURL }) => {
        // Use absolute URL from baseURL to ensure file is found on dev server
        const response = await page.request.get(baseURL + '/src/editor-data.js');
        expect(response.status(), 'Failed to fetch /src/editor-data.js').toBe(200);
        
        const sourceCode = await response.text();
        const hasViewCountIncrement = sourceCode.includes('viewCount') && 
            sourceCode.includes('FieldValue.increment(1)');
        expect(hasViewCountIncrement, 'editor-data.js should contain FieldValue.increment(1) for viewCount').toBeTruthy();
    });

    /**
     * [Source Pattern] Test 2: lastOpened serverTimestamp on editor load
     */
    test('lastOpened serverTimestamp - FieldValue.serverTimestamp() call exists in editor-data.js', async ({ page, baseURL }) => {
        const response = await page.request.get(baseURL + '/src/editor-data.js');
        expect(response.status()).toBe(200);
        
        const sourceCode = await response.text();
        const hasLastOpenedTimestamp = sourceCode.includes('lastOpened') && 
            sourceCode.includes('FieldValue.serverTimestamp()');
        expect(hasLastOpenedTimestamp, 'editor-data.js should contain FieldValue.serverTimestamp() for lastOpened').toBeTruthy();
    });

    /**
     * [Source Pattern] Test 3: Comment createdAt serverTimestamp
     */
    test('Comment createdAt - FieldValue.serverTimestamp() call exists in editor-comments.js', async ({ page, baseURL }) => {
        const response = await page.request.get(baseURL + '/src/editor-comments.js');
        expect(response.status()).toBe(200);
        
        const sourceCode = await response.text();
        const hasServerTimestamp = sourceCode.includes('FieldValue.serverTimestamp()');
        expect(hasServerTimestamp, 'editor-comments.js should contain FieldValue.serverTimestamp()').toBeTruthy();
    });

    /**
     * [Source Pattern] Test 4: shareCount increment
     */
    test('shareCount increment - FieldValue.increment call exists in editor-actions.js', async ({ page, baseURL }) => {
        const response = await page.request.get(baseURL + '/src/editor-actions.js');
        expect(response.status()).toBe(200);
        
        const sourceCode = await response.text();
        const hasShareCountIncrement = sourceCode.includes('shareCount') && 
            sourceCode.includes('FieldValue.increment');
        expect(hasShareCountIncrement, 'editor-actions.js should contain FieldValue.increment for shareCount').toBeTruthy();
    });

    /**
     * [Network Payload] Test 5: Verify runtime network payload for increment
     */
    test('Network Payload: updateTree should send __firestoreTransform for increment', async ({ page }) => {
        const firestoreRequests = [];
        page.on('request', request => {
            if (request.url().includes('api/firestore') && request.method() === 'POST') {
                try {
                    firestoreRequests.push(JSON.parse(request.postData() || '{}'));
                } catch (e) {}
            }
        });

        await page.goto('/pages/editor.html?id=test-tree');
        await page.waitForLoadState('networkidle');

        // Trigger an action that causes a tree update with increment
        await page.evaluate(async () => {
            if (window.postgresDB) {
                await window.postgresDB.collection('trees').doc('test-tree').update({
                    viewCount: firebase.firestore.FieldValue.increment(1)
                });
            }
        });

        // Poll for the captured request to avoid race conditions
        let updateData = null;
        for (let i = 0; i < 20; i++) {
            const req = firestoreRequests.find(r => r.method === 'update' && r.path === 'trees/test-tree');
            if (req && req.data && req.data.viewCount) {
                updateData = req.data;
                break;
            }
            await page.waitForTimeout(250);
        }

        expect(updateData, 'Request for trees/test-tree update with viewCount must be captured').not.toBeNull();
        expect(updateData.viewCount.__firestoreTransform).toBe(true);
        expect(updateData.viewCount.type).toBe('increment');
        expect(updateData.viewCount.operand).toBe(1);
    });

    /**
     * [Network Payload] Test 6: Verify runtime network payload for serverTimestamp
     */
    test('Network Payload: updateTree should send __firestoreTransform for serverTimestamp', async ({ page }) => {
        const firestoreRequests = [];
        page.on('request', request => {
            if (request.url().includes('api/firestore') && request.method() === 'POST') {
                try {
                    firestoreRequests.push(JSON.parse(request.postData() || '{}'));
                } catch (e) {}
            }
        });

        await page.goto('/pages/editor.html?id=test-tree');
        await page.waitForLoadState('networkidle');

        await page.evaluate(async () => {
            if (window.postgresDB) {
                await window.postgresDB.collection('trees').doc('test-tree').update({
                    lastOpened: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        });

        let updateData = null;
        for (let i = 0; i < 20; i++) {
            const req = firestoreRequests.find(r => r.method === 'update' && r.path === 'trees/test-tree');
            if (req && req.data && req.data.lastOpened) {
                updateData = req.data;
                break;
            }
            await page.waitForTimeout(250);
        }

        expect(updateData, 'Request for trees/test-tree update with lastOpened must be captured').not.toBeNull();
        expect(updateData.lastOpened.__firestoreTransform).toBe(true);
        expect(updateData.lastOpened.type).toBe('serverTimestamp');
    });

    /**
     * [Shim Load] Test 5: Verify compat layer is loaded in editor page
     * Dependency: shared layer (firebase-firestore-compat.js)
     * Scope: confirms firebase.firestore function exists at runtime
     */
    test('Compat layer should be loaded for FieldValue transformation', async ({ page }) => {
        await page.goto('/pages/editor.html?id=test-tree');
        await page.waitForLoadState('networkidle');

        // Check that the compat layer intercepts firebase.firestore calls
        const hasFirestore = await page.evaluate(() => {
            return typeof firebase !== 'undefined' && 
                   typeof firebase.firestore === 'function';
        });
        
        expect(hasFirestore, 'Firebase SDK should be loaded').toBeTruthy();
    });

    /**
     * [Shim Runtime] Test 6: FieldValue.increment produces correct transform object
     * Dependency: shared layer (firebase-firestore-compat.js)
     * Scope: verifies runtime output of FieldValue.increment(1) in the browser context.
     *        Does NOT verify server-side applyTransform() processing.
     */
    test('FieldValue.increment(1) should produce {__firestoreTransform: true, type: "increment", operand: 1}', async ({ page }) => {
        await page.goto('/pages/editor.html?id=test-tree');
        await page.waitForLoadState('networkidle');

        const result = await page.evaluate(() => {
            if (typeof firebase === 'undefined' || typeof firebase.firestore !== 'function') return null;
            return firebase.firestore.FieldValue.increment(1);
        });

        expect(result, 'firebase.firestore.FieldValue.increment(1) must return a value').not.toBeNull();
        expect(result.__firestoreTransform).toBe(true);
        expect(result.type).toBe('increment');
        expect(result.operand).toBe(1);
    });

    /**
     * [Shim Runtime] Test 7: FieldValue.serverTimestamp produces correct transform object
     * Dependency: shared layer (firebase-firestore-compat.js)
     * Scope: verifies runtime output of FieldValue.serverTimestamp() in the browser context.
     */
    test('FieldValue.serverTimestamp() should produce {__firestoreTransform: true, type: "serverTimestamp"}', async ({ page }) => {
        await page.goto('/pages/editor.html?id=test-tree');
        await page.waitForLoadState('networkidle');

        const result = await page.evaluate(() => {
            if (typeof firebase === 'undefined' || typeof firebase.firestore !== 'function') return null;
            return firebase.firestore.FieldValue.serverTimestamp();
        });

        expect(result, 'firebase.firestore.FieldValue.serverTimestamp() must return a value').not.toBeNull();
        expect(result.__firestoreTransform).toBe(true);
        expect(result.type).toBe('serverTimestamp');
    });

    /**
     * [Shim Runtime] Test 8: FieldValue.increment with custom operand
     * Dependency: shared layer (firebase-firestore-compat.js)
     * Scope: verifies operand is correctly converted to Number.
     */
    test('FieldValue.increment(n) should pass numeric operand through', async ({ page }) => {
        await page.goto('/pages/editor.html?id=test-tree');
        await page.waitForLoadState('networkidle');

        const result = await page.evaluate(() => {
            if (typeof firebase === 'undefined' || typeof firebase.firestore !== 'function') return null;
            return firebase.firestore.FieldValue.increment(5);
        });

        expect(result).not.toBeNull();
        expect(result.__firestoreTransform).toBe(true);
        expect(result.type).toBe('increment');
        expect(result.operand).toBe(5);
    });

    /**
     * [Shim Runtime] Test 9: FieldValue.delete produces correct transform object
     * Dependency: shared layer (firebase-firestore-compat.js)
     * Scope: verifies FieldValue.delete() transform structure (not currently used
     *        in editor-*.js but defined in the shim for completeness).
     */
    test('FieldValue.delete() should produce {__firestoreTransform: true, type: "delete"}', async ({ page }) => {
        await page.goto('/pages/editor.html?id=test-tree');
        await page.waitForLoadState('networkidle');

        const result = await page.evaluate(() => {
            if (typeof firebase === 'undefined' || typeof firebase.firestore !== 'function') return null;
            return firebase.firestore.FieldValue.delete();
        });

        expect(result).not.toBeNull();
        expect(result.__firestoreTransform).toBe(true);
        expect(result.type).toBe('delete');
    });
});