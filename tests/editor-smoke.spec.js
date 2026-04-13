import { test, expect } from '@playwright/test';

/**
 * Editor Smoke Tests
 * Focuses on verifying that the complex editor shell and shared architecture
 * are intact and interactable without breaking core page logic.
 * 
 * Coverage:
 * - Shell initialization
 * - Read-only badge for anonymous users
 * - Core UI elements rendering
 * - Navigation to home
 * - Console error monitoring
 * 
 * Excluded (brittle):
 * - Canvas node coordinates
 * - AI interaction flows
 * - Detailed node editing
 * - Save/submit actions
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
                const isNoise = ['favicon.ico', '404', 'DevTools', 'message port', 'net::ERR'].some(n => text.includes(n));
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

    // Scenario 3: Core UI Elements Rendering
    test('Editor UI: Should render core wrapper and stats banner', async ({ page }) => {
        await page.goto('/pages/editor.html?id=bts');
        
        // Wait for shell initialization
        await expect(page.locator('body')).toHaveClass(/app-loaded/, { timeout: 15000 });
        
        // Check core wrapper exists (canvas container)
        const wrapper = page.locator('#wrapper');
        await expect(wrapper).toBeVisible();
        
        // Check stats banner exists (shows node/moment counts)
        const statsBanner = page.locator('#tree-stats-banner');
        await expect(statsBanner).toBeVisible();
        
        // Check stats text contains expected format
        const statsText = await page.locator('#tree-stats-text').textContent();
        expect(statsText).toContain('노드');
    });

    // Scenario 4: Editor Mode Toggle Buttons
    test('Editor UI: Should render mode toggle buttons', async ({ page }) => {
        await page.goto('/pages/editor.html?id=bts');
        
        // Wait for shell initialization
        await expect(page.locator('body')).toHaveClass(/app-loaded/, { timeout: 15000 });
        
        // Check tree mode button exists
        const treeBtn = page.locator('#mode-tree-btn');
        await expect(treeBtn).toBeVisible();
        
        // Check timeline mode button exists
        const timelineBtn = page.locator('#mode-timeline-btn');
        await expect(timelineBtn).toBeVisible();
        
        // Verify tree mode is active by default
        await expect(treeBtn).toHaveClass(/is-active/);
    });

    // Scenario 5: Navigation Exit
    test('Editor Navigation: Should return to home page via home button', async ({ page }) => {
        await page.goto('/pages/editor.html?id=bts');
        
        const homeBtn = page.locator('.editor-home-btn');
        await expect(homeBtn).toBeVisible();
        
        await homeBtn.click();
        
        // Should redirect to index.html
        await expect(page).toHaveURL(/\/index\.html|localhost:\d+\/$/);
        
        // Verify index page has core elements (logo/brand)
        const logo = page.locator('.logo, .brand-link, [class*="brand"]').first();
        await expect(logo).toBeVisible({ timeout: 5000 });
    });

    // Scenario 6: Editor Shell Load Marker
    test('Editor Shell: Should complete load without critical errors', async ({ page }) => {
        await page.goto('/pages/editor.html?id=bts');
        
        // Wait for app-loaded class on body (marker of complete initialization)
        await expect(page.locator('body')).toHaveClass(/app-loaded/, { timeout: 15000 });
        
        // Verify editor-canvas-shell exists (core canvas wrapper)
        const canvasShell = page.locator('.editor-canvas-shell');
        await expect(canvasShell).toBeVisible();
        
        // Verify connections layer exists (SVG layer for tree lines)
        const connections = page.locator('#connections');
        await expect(connections).toBeVisible();
    });

});
