import { test, expect } from '@playwright/test';

/**
 * Lovetree Smoke E2E Tests
 * Enhanced with structured console error tracking and better stability.
 */

// Use baseURL from playwright.config.js for local/CI portability
const BASE_URL = ''; 

let consoleErrors = [];
let pageErrors = [];
let consoleWarnings = [];

test.describe('Lovetree Smoke Tests', () => {

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
  await expect(page).toHaveTitle(/Lovetree/);

  const logo = page.locator('.logo, #nav-brand');
  const gnb = page.locator('.gnb-v2, .gnb');
  const authBtn = page.locator('.btn-pill-auth, #nav-auth-item');

  await expect(logo).toBeVisible();
  await expect(gnb).toBeVisible();
  await expect(authBtn).toBeVisible();

  const heroSection = page.locator('.hero-v2').first();
  await expect(heroSection).toBeAttached();
});

test('Home Page: Auth button is present and points to login', async ({ page }) => {
  await page.goto(BASE_URL + '/');

  const authBtn = page.locator('.btn-pill-auth, #nav-auth-item');
  await expect(authBtn).toBeVisible();

  const href = await authBtn.getAttribute('href');
  expect(href).toContain('/pages/login.html');
});

test('Community Page: Load and grid present', async ({ page }) => {
  await page.goto(BASE_URL + '/pages/community.html');

  await page.waitForLoadState('domcontentloaded');

  const communityMain = page.locator('main');
  const discoveryGrid = page.locator('#discovery-grid-demo, #discovery-grid');

  await expect(communityMain).toBeAttached();
  await expect(discoveryGrid.first()).toBeVisible();
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

test('Settings Modal: Opens from owner page', async ({ page }) => {
  await page.goto(BASE_URL + '/pages/owner.html');

  await page.waitForLoadState('domcontentloaded');

  const settingsModal = page.locator('#settings-modal');
  // Wait for dynamic injection if not present (handled by shared-layout.js)
  await expect(settingsModal).toBeAttached({ timeout: 10000 });
});
});
