import { test, expect } from '@playwright/test';

/**
 * Editor Smoke Tests (Draft)
 * Focuses on verifying that the complex editor shell and shared architecture
 * are intact and interactable without breaking core page logic.
 */

test.describe('Editor Smoke Checks', () => {
    
    let caughtErrors = [];

    test.beforeEach(async ({ page }) => {
        caughtErrors = [];

        // Intercept API calls to prevent 404 console errors in static test environment
        await page.route('**/api/firestore', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ doc: { id: 'bts', exists: false } })
            });
        });
        
        page.on('console', msg => {
            if (msg.type() === 'error') {
                const text = msg.text();
                // Filter known noise
                const isNoise = ['favicon.ico', '404', 'DevTools', 'message port'].some(n => text.includes(n));
                if (!isNoise) caughtErrors.push(`[Console Error] ${text}`);
            }
        });
        page.on('pageerror', err => {
            caughtErrors.push(`[Page Error] ${err.message}`);
        });
    });

    test.afterEach(async ({}, testInfo) => {
        if (caughtErrors.length > 0 && testInfo.status === 'passed') {
            throw new Error(`Editor shell caught logic errors:\n${caughtErrors.join('\n')}`);
        }
    });

    // Scenario 1: Shell Initialization
    test('Editor Shell: Should initialize and set app-loaded flag', async ({ page }) => {
        await page.goto('/pages/editor.html?id=bts');
        
        // Editor has many scripts, so give it a bit more time
        const body = page.locator('body');
        await expect(body).toHaveClass(/app-loaded/, { timeout: 15000 });
        
        const title = await page.title();
        expect(title).toContain('LoveTree Editor');
    });

    // Scenario 2: Auth/Permission Guard (Anonymous)
    test('Editor Permission: Should show Read-only badge for anonymous users', async ({ page }) => {
        await page.goto('/pages/editor.html?id=bts');
        await page.waitForLoadState('domcontentloaded');
        
        // Check for read-only indicator (badge or state)
        // From editor.html, we have #tree-readonly-badge
        const badge = page.locator('#tree-readonly-badge');
        
        // Wait for shared-layout.js or editor-page-init.js to determine auth state
        // In anonymous mode, it should eventually be visible
        await expect(badge).toBeVisible({ timeout: 10000 });
        const text = await badge.textContent();
        expect(text).toContain('읽기 전용');
    });

    // Scenario 5: Navigation Exit
    test('Editor Navigation: Should return to home page via home button', async ({ page }) => {
        await page.goto('/pages/editor.html?id=bts');
        
        const homeBtn = page.locator('.editor-home-btn');
        await expect(homeBtn).toBeVisible();
        
        await homeBtn.click();
        
        // Should redirect to index.html
        await expect(page).toHaveURL(/\/index\.html|localhost:\d+\/$/);
    });

});
