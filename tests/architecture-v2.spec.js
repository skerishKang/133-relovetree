import { test, expect } from '@playwright/test';

/**
 * Architecture V2 Smoke Tests - Precision Refined
 * Validates the core architectural requirements for consistent layout,
 * auth initialization, and user-facing error masking with strict error monitoring.
 */

test.describe('Standard Architecture (V2) Checks', () => {
    
    let caughtErrors = [];

    // 1. Strict Error Monitoring
    test.beforeEach(async ({ page }) => {
        caughtErrors = [];
        
        page.on('console', msg => {
            if (msg.type() === 'error') {
                const text = msg.text();
                // Filter out common browser noise that doesn't impact app reliability
                const isNoise = [
                    'favicon.ico', 
                    '404', 
                    'DevTools listening on',
                    'message port closed',
                    'Extension'
                ].some(noise => text.includes(noise));
                
                if (!isNoise) {
                    caughtErrors.push(`[Console Error] ${text}`);
                }
            }
        });

        page.on('pageerror', error => {
            caughtErrors.push(`[Page Error] ${error.message}`);
        });
    });

    test.afterEach(async ({}, testInfo) => {
        // If the test logic itself passed, but we caught background errors, fail the test
        if (caughtErrors.length > 0 && testInfo.status === 'passed') {
            throw new Error(`Test passed logic but caught ${caughtErrors.length} critical errors:\n${caughtErrors.join('\n')}`);
        }
    });

    const targetPages = [
        { name: 'Landing (index)', path: '/' },
        { name: 'Lovetree', path: '/pages/lovetree.html' },
        { name: 'Community', path: '/pages/community.html' },
        { name: 'Login', path: '/pages/login.html' },
        { name: 'Dashboard (My Trees)', path: '/pages/my-trees.html' }
    ];

    // 2. Initialization & App-Loaded Flag Check
    for (const pageInfo of targetPages) {
        test(`${pageInfo.name}: Should initialize shared layout and set app-loaded flag`, async ({ page }) => {
            await page.goto(pageInfo.path);
            await page.waitForLoadState('domcontentloaded');
            
            const body = page.locator('body');
            // Wait for shared.js to finish initialization
            await expect(body).toHaveClass(/app-loaded/, { timeout: 10000 });
        });
    }

    // 3. Navigation Auth UI Check
    const authPages = [
        { name: 'Landing (index)', path: '/', selector: '.btn-pill-auth' },
        { name: 'Lovetree', path: '/pages/lovetree.html', selector: '#nav-auth-item' },
        { name: 'Community', path: '/pages/community.html', selector: '#nav-auth-item' }
    ];

    for (const pageInfo of authPages) {
        test(`${pageInfo.name}: Should have visible Auth UI button`, async ({ page }) => {
            await page.goto(pageInfo.path);
            await page.waitForLoadState('networkidle');
            
            const authBtn = page.locator(pageInfo.selector);
            await expect(authBtn).toBeVisible();
            
            const text = await authBtn.textContent();
            expect(text?.trim()).toMatch(/로그인|내 트리/);
        });
    }

    // 4. Community Error Masking (Firestore Precise Interception)
    test('Community: Should mask technical Firestore terms in error messages', async ({ page }) => {
        // Intercept the specific POST request to the Firestore compat API
        await page.route('**/api/firestore', async route => {
            const request = route.request();
            if (request.method() === 'POST') {
                const payload = request.postDataJSON();
                // Ensure we are targeting the tree query collection call
                if (payload && payload.op === 'queryCollection' && payload.path === 'trees') {
                    await route.fulfill({
                        status: 500,
                        contentType: 'application/json',
                        body: JSON.stringify({ 
                            error: '[Netlify-Function-Postgres-Error] Firestore-like failure: permission_denied at trees/public' 
                        })
                    });
                    return;
                }
            }
            await route.continue();
        });

        await page.goto('/pages/community.html');
        
        const errorMsg = page.locator('#community-error-msg');
        // Wait for the async failure and UI update
        await expect(errorMsg).toBeVisible({ timeout: 15000 });
        
        const text = await errorMsg.textContent();
        
        // Assert technical terms are NEVER revealed
        expect(text).not.toContain('Firestore');
        expect(text).not.toContain('firebase');
        expect(text).not.toContain('Postgres');
        expect(text).not.toContain('Netlify');
        
        // Assert friendly copy is displayed
        expect(text).toMatch(/다시 시도|원활하지 않습니다|준비되지 않았습니다/);
    });

    // 5. Unauthenticated Shell Stability
    test('My Trees: Should load shell without crash when unauthenticated', async ({ page }) => {
        await page.goto('/pages/my-trees.html');
        
        // Check for common shell elements to ensure rendering completed
        const header = page.locator('header h1, .header h1');
        await expect(header).toBeVisible();
        
        // Ensure shared.js ran successfully and set the flag without throwing ReferenceErrors
        await expect(page.locator('body')).toHaveClass(/app-loaded/);
    });

});
