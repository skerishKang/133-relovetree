import { test, expect } from '@playwright/test';

/**
 * Architecture V2 Smoke Tests
 * Validates the core architectural requirements for consistent layout,
 * auth initialization, and user-facing error masking.
 */

test.describe('Standard Architecture (V2) Checks', () => {
    
    // Global Error Monitoring
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => {
            if (msg.type() === 'error') {
                // We exclude expected Firebase 404s if any, but focus on JS ReferenceErrors/SyntaxErrors
                if (!msg.text().includes('404')) {
                    console.error(`[Browser Console Error] ${msg.text()}`);
                }
            }
        });
        page.on('pageerror', error => {
            throw new Error(`Uncaught Page Error: ${error.message}`);
        });
    });

    const targetPages = [
        { name: 'Landing (index)', path: '/' },
        { name: 'Lovetree', path: '/pages/lovetree.html' },
        { name: 'Community', path: '/pages/community.html' },
        { name: 'Login', path: '/pages/login.html' },
        { name: 'Dashboard (My Trees)', path: '/pages/my-trees.html' }
    ];

    // 1. Initialization Check (app-loaded flag)
    for (const pageInfo of targetPages) {
        test(`${pageInfo.name}: Should initialize shared layout and set app-loaded flag`, async ({ page }) => {
            await page.goto(pageInfo.path);
            
            // Wait for shared.js to finish initApp
            const body = page.locator('body');
            await expect(body).toHaveClass(/app-loaded/, { timeout: 5000 });
        });
    }

    // 2. Navigation Auth UI Check
    const authPages = [
        { name: 'Landing (index)', path: '/', selector: '.btn-pill-auth' },
        { name: 'Lovetree', path: '/pages/lovetree.html', selector: '#nav-auth-item' },
        { name: 'Community', path: '/pages/community.html', selector: '#nav-auth-item' }
    ];

    for (const pageInfo of authPages) {
        test(`${pageInfo.name}: Should have visible Auth UI button`, async ({ page }) => {
            await page.goto(pageInfo.path);
            const authBtn = page.locator(pageInfo.selector);
            await expect(authBtn).toBeVisible();
            
            // Initial state should be '로그인' for anonymous
            const text = await authBtn.textContent();
            expect(text?.trim()).toContain('로그인');
        });
    }

    // 3. Community Error Masking (Firestore leak prevention)
    test('Community: Should mask technical Firestore terms in error messages', async ({ page }) => {
        // Intercept any potential API call or just force a mock error through console/runtime
        // For this test, we can mock the network response that community.html expects
        await page.route('** /api/public-trees *', async route => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ message: '[Internal] Firestore error: permission_denied at /trees' })
            });
        });

        await page.goto('/pages/community.html');
        
        const errorMsg = page.locator('#community-error-msg');
        // Wait for either the technical error OR the timeout fallback
        await expect(errorMsg).toBeVisible({ timeout: 15000 });
        
        const text = await errorMsg.textContent();
        console.log(`Masked Error Message seen: ${text}`);
        
        // Assert technical terms are missing
        expect(text).not.toContain('Firestore');
        expect(text).not.toContain('firebase');
        
        // Assert user-friendly message is present (either our masked one or the fallback one)
        const isFriendly = text.includes('다시 시도') || text.includes('로딩 기능') || text.includes('원활하지 않습니다');
        expect(isFriendly).toBe(true);
    });

    // 4. Dashboards Unauthenticated Handling
    test('My Trees: Should load shell without crash when unauthenticated', async ({ page }) => {
        // This page heavily depends on Firebase Auth
        await page.goto('/pages/my-trees.html');
        
        // Check for common shell elements
        const header = page.locator('header h1, .header h1');
        await expect(header).toBeVisible();
        
        // Ensure app-loaded exists (meaning shared.js didn't crash)
        await expect(page.locator('body')).toHaveClass(/app-loaded/);
    });

});
