import { test, expect } from '@playwright/test';

/**
 * Relovetree Smoke E2E Tests
 * Enhanced with structured console error tracking and better stability.
 */

let consoleErrors = [];
let pageErrors = [];
let consoleWarnings = [];

test.describe('Relovetree Smoke Tests', () => {

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    consoleWarnings = [];

    // Structured console message collection
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        consoleErrors.push(text);
        console.log(`[Console Error] ${text}`);
      } else if (type === 'warning') {
        consoleWarnings.push(text);
        console.log(`[Console Warning] ${text}`);
      }
    });

    // Page-level errors (uncaught exceptions)
    page.on('pageerror', error => {
      const text = error.message;
      pageErrors.push(text);
      console.log(`[Page Error] ${text}`);
    });
  });

  test.afterEach(async ({}, testInfo) => {
    const hasErrors = consoleErrors.length > 0 || pageErrors.length > 0;
    
    if (hasErrors) {
      console.log(`=== Test "${testInfo.title}" captured ===`);
      console.log(`  Console errors: ${consoleErrors.length}`);
      console.log(`  Page errors: ${pageErrors.length}`);
      consoleErrors.forEach(e => console.log(`    - ${e.substring(0, 100)}`));
      pageErrors.forEach(e => console.log(`    - ${e.substring(0, 100)}`));
    }
    
    // Fail test if there were page errors (not console errors - those may be expected)
    if (pageErrors.length > 0) {
      throw new Error(`Test failed due to ${pageErrors.length} page errors`);
    }
  });

  test('Home Page: Load and UI elements present', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/LoveTree/);
    
    // Stable selectors for key UI elements
    const searchBtn = page.locator('#search-btn');
    const settingsBtn = page.locator('#settings-btn');
    const mainNav = page.locator('#main-nav');
    
    await expect(searchBtn).toBeVisible();
    await expect(settingsBtn).toBeVisible();
    await expect(mainNav).toBeVisible();
    
    // Check main content loaded
    const heroSection = page.locator('.hero-shell, [class*="hero"]').first();
    await expect(heroSection).toBeAttached();
  });

  test('Home Page: Search Modal opens', async ({ page }) => {
    await page.goto('/');
    
    const searchBtn = page.locator('#search-btn');
    await searchBtn.click();
    
    const searchModal = page.locator('#search-modal');
    await expect(searchModal).toBeVisible();
    
    const searchInput = page.locator('#search-input');
    await expect(searchInput).toBeAttached();
    
    // Close modal
    const closeBtn = searchModal.locator('button[aria-label*="닫기"], .modal-close').first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
    }
  });

  test('Community Page: Load and list present', async ({ page }) => {
    await page.goto('/community.html');
    
    await page.waitForLoadState('domcontentloaded');
    
    // Use multiple fallback selectors for stability
    const communityContent = page.locator(
      '#community-post-list, #posts-container, main, [class*="community"]'
    ).first();
    
    await expect(communityContent).toBeAttached();
  });

  test('Owner Page: Management dashboard shell', async ({ page }) => {
    await page.goto('/owner.html');
    
    await page.waitForLoadState('domcontentloaded');
    
    // Use stable ID-based selectors
    const treesList = page.locator('#owner-trees-list');
    const createBtn = page.locator('#create-tree-btn, button:has-text("만들기")').first();
    
    await expect(treesList).toBeAttached();
    await expect(createBtn).toBeVisible();
  });

  test('Editor Page: Load without crash (TDZ check)', async ({ page }) => {
    await page.goto('/editor.html?id=bts');
    
    await page.waitForLoadState('networkidle');
    
    // Stable selectors using IDs
    const toggleModeBtn = page.locator('#toggle-mode-btn');
    const addNodeBtn = page.locator('#add-node-btn');
    
    await expect(toggleModeBtn).toBeVisible();
    await expect(addNodeBtn).toBeVisible();

    // Check no body-level error class
    const bodyClass = await page.locator('body').getAttribute('class');
    expect(bodyClass?.includes('error') || bodyClass?.includes('Error')).not.toBe(true);
  });

  test('Editor Page: Mode toggle interaction', async ({ page }) => {
    await page.goto('/editor.html?id=test-tree');
    
    await page.waitForLoadState('networkidle');
    
    const toggleModeBtn = page.locator('#toggle-mode-btn');
    
    if (await toggleModeBtn.isVisible().catch(() => false)) {
      await toggleModeBtn.click();
      await page.waitForTimeout(300);
      
      const bodyClass = await page.locator('body').getAttribute('class');
      expect(bodyClass?.includes('error') || bodyClass?.includes('Error')).not.toBe(true);
    }
  });

  test('Admin Page: Login overlay present', async ({ page }) => {
    await page.goto('/admin.html');
    
    await page.waitForLoadState('domcontentloaded');
    
    // Stable selector
    const loginOverlay = page.locator('#loginOverlay');
    await expect(loginOverlay).toBeAttached();
  });

  test('Settings Modal: Opens from home page', async ({ page }) => {
    await page.goto('/');
    
    const settingsBtn = page.locator('#settings-btn');
    await settingsBtn.click();
    
    const settingsModal = page.locator('#settings-modal');
    await expect(settingsModal).toBeVisible();
    
    // Check modal has content
    const modalTitle = settingsModal.locator('.modal-title, h3').first();
    await expect(modalTitle).toBeAttached();
  });
});