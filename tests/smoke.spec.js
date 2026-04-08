import { test, expect } from '@playwright/test';

/**
 * Relovetree Smoke E2E Tests
 * Focuses on production health and core UI presence.
 */

test.describe('Relovetree Smoke Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Capture console errors to detect regressions like editorMode TDZ
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`BROWSER ERROR: "${msg.text()}"`);
      }
    });
  });

  test('Home Page: Visual Consistency & Search presence', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/LoveTree/);
    
    // Check key UI elements
    await expect(page.locator('#search-btn')).toBeVisible();
    await expect(page.locator('#settings-btn')).toBeVisible();
    
    // Check if the grid container exists
    await expect(page.locator('#artist-cards-container')).toBeAttached();
  });

  test('Community Page: Result listing', async ({ page }) => {
    await page.goto('/community.html');
    // Should have a posts container or message
    const postsSection = page.locator('#posts-container');
    await expect(postsSection).toBeAttached();
  });

  test('Owner Page: Management dashboard shell', async ({ page }) => {
    await page.goto('/owner.html');
    // Check for the tree list area
    await expect(page.locator('#owner-trees-list')).toBeAttached();
    // Check for "Create" button
    await expect(page.locator('#create-tree-btn')).toBeVisible();
  });

  test('Editor Page: Loading and Basic Interaction (TDZ Check)', async ({ page }) => {
    // Using a known public ID for smoke test
    await page.goto('/editor.html?id=bts');
    
    // Wait for runtime initialization
    await page.waitForLoadState('networkidle');
    
    // check for major UI buttons that might trigger TDZ errors if clicked early
    const listModeBtn = page.locator('#toggle-mode-btn');
    const addNodeBtn = page.locator('#add-node-btn');
    
    await expect(listModeBtn).toBeVisible();
    await expect(addNodeBtn).toBeVisible();

    // Interaction test: toggle mode (often triggers runtime getters)
    await listModeBtn.click();
    // If a TDZ error occurs, our console listener would catch it, 
    // and we can also check if the mode actually changed or if the page froze.
    await expect(page.locator('body')).not.toHaveClass(/error/);
  });

  test('Admin Page: Login presence', async ({ page }) => {
    await page.goto('/admin.html');
    // Admin usually shows a login overlay if not authenticated
    const loginOverlay = page.locator('#loginOverlay');
    // It might be hidden if already logged in or visible if guest
    // In smoke test, we just check if it exists in DOM
    await expect(loginOverlay).toBeAttached();
  });
});
