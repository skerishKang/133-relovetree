import { test, expect } from '@playwright/test';

/**
 * Relovetree Smoke E2E Tests
 * Enhanced with structured console error tracking and better stability.
 */

const BASE_URL = 'https://lovetree.limone.dev';

let consoleErrors = [];
let pageErrors = [];
let consoleWarnings = [];

test.describe('Relovetree Smoke Tests', () => {

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    consoleWarnings = [];

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
    
    if (pageErrors.length > 0) {
      throw new Error(`Test failed due to ${pageErrors.length} page errors`);
    }
  });

  test('Home Page: Load and UI elements present', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    await expect(page).toHaveTitle(/Relovetree/);
    
    const settingsBtn = page.locator('#settings-btn');
    const mainNav = page.locator('#main-nav');
    
    await expect(settingsBtn).toBeVisible();
    await expect(mainNav).toBeVisible();
    
    const heroSection = page.locator('.hero-shell, [class*="hero"]').first();
    await expect(heroSection).toBeAttached();
  });

  test('Home Page: Search Modal opens', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    
    const searchBtn = page.locator('#search-btn');
    await searchBtn.click();
    
    const searchModal = page.locator('#search-modal');
    await expect(searchModal).toBeVisible();
    
    const searchInput = page.locator('#search-input');
    await expect(searchInput).toBeAttached();
    
    const closeBtn = searchModal.locator('button[aria-label*="닫기"], .modal-close').first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
    }
  });

  test('Community Page: Load and list present', async ({ page }) => {
    await page.goto(BASE_URL + '/pages/community.html');
    
    await page.waitForLoadState('domcontentloaded');
    
    const communityContent = page.locator(
      '#community-post-list, #posts-container, main, [class*="community"]'
    ).first();
    
    await expect(communityContent).toBeAttached();
  });

  test('Owner Page: Management dashboard shell', async ({ page }) => {
    await page.goto(BASE_URL + '/pages/owner.html');
    
    await page.waitForLoadState('domcontentloaded');
    
    const treesTbody = page.locator('#owner-tree-tbody');
    const createBtn = page.locator('#create-tree-btn');
    
    await expect(treesTbody).toBeAttached();
    await expect(createBtn).toBeVisible();
  });

  test('Editor Page: Load without crash (TDZ check)', async ({ page }) => {
    await page.goto(BASE_URL + '/pages/editor.html?id=bts');
    
    await page.waitForLoadState('networkidle');
    
    const modeTreeBtn = page.locator('#mode-tree-btn');
    const modeTimelineBtn = page.locator('#mode-timeline-btn');
    
    await expect(modeTreeBtn).toBeVisible();
    await expect(modeTimelineBtn).toBeVisible();

    const bodyClass = await page.locator('body').getAttribute('class');
    expect(bodyClass?.includes('error') || bodyClass?.includes('Error')).not.toBe(true);
  });

  test('Editor Page: Mode toggle interaction', async ({ page }) => {
    await page.goto(BASE_URL + '/pages/editor.html?id=test-tree');
    
    await page.waitForLoadState('networkidle');
    
    const modeTimelineBtn = page.locator('#mode-timeline-btn');
    
    if (await modeTimelineBtn.isVisible().catch(() => false)) {
      await modeTimelineBtn.click();
      await page.waitForTimeout(300);
      
      const bodyClass = await page.locator('body').getAttribute('class');
      expect(bodyClass?.includes('error') || bodyClass?.includes('Error')).not.toBe(true);
    }
  });

  test('Admin Page: Login overlay present', async ({ page }) => {
    await page.goto(BASE_URL + '/pages/admin.html');
    
    await page.waitForLoadState('domcontentloaded');
    
    const loginOverlay = page.locator('#loginOverlay');
    await expect(loginOverlay).toBeAttached();
  });

  test('Settings Modal: Opens from home page', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    
    const settingsBtn = page.locator('#settings-btn');
    await settingsBtn.click();
    
    const settingsModal = page.locator('#settings-modal');
    await expect(settingsModal).toBeVisible();
    
    const modalTitle = settingsModal.locator('.modal-title, h3').first();
    await expect(modalTitle).toBeAttached();
  });
});
