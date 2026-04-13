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

    // Mock the Firestore API to prevent 501 errors from crashing the scripts
    // in a static-only local server environment.
    await page.route('**/api/firestore', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        const payload = JSON.parse(request.postData() || '{}');
        
        // Return dummy data for common operations
        if (payload.op === 'getDoc' || payload.method === 'get') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ 
              doc: { 
                exists: true, 
                data: { 
                  id: 'test', 
                  name: 'Test Tree',
                  ownerId: 'test-user',
                  viewCount: 100,
                  nodes: [{ id: 1, title: 'Start', x: 100, y: 100 }],
                  edges: [],
                  likes: [],
                  comments: [],
                  lastUpdated: new Date().toISOString()
                } 
              } 
            })
          });
        } else if (payload.op === 'queryCollection' || payload.method === 'query') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ 
              docs: [{
                id: 'test-tree-1',
                data: { 
                  name: 'Demo Tree', 
                  viewCount: 42, 
                  ownerId: 'demo',
                  nodes: [],
                  edges: [],
                  likes: [],
                  comments: []
                }
              }] 
            })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          });
        }
        return;
      }
      await route.continue();
    });

    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        // Filter out noise
        if (!text.includes('favicon.ico') && !text.includes('404') && !text.includes('501')) {
          consoleErrors.push(text);
        }
      }
    });

    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });
  });

  test.afterEach(async ({}, testInfo) => {
    if (pageErrors.length > 0) {
      throw new Error(`Test failed due to ${pageErrors.length} page errors: ${pageErrors.join(', ')}`);
    }
  });

test('Home Page: Load and UI elements present', async ({ page }) => {
  await page.goto(BASE_URL + '/');
  await expect(page.locator('body')).toHaveClass(/app-loaded/, { timeout: 10000 });

  const logo = page.locator('.logo, #nav-brand, .gnb-brand');
  const gnb = page.locator('.gnb-v2, .gnb');
  const authBtn = page.locator('.btn-pill-auth, #nav-auth-item, .nav-login');

  await expect(logo).toBeVisible();
  await expect(gnb).toBeVisible();
  await expect(authBtn).toBeVisible();
});

test('Home Page: Auth button points to login', async ({ page }) => {
  await page.goto(BASE_URL + '/');
  await expect(page.locator('body')).toHaveClass(/app-loaded/, { timeout: 10000 });

  const authBtn = page.locator('.btn-pill-auth, #nav-auth-item, .nav-login');
  const href = await authBtn.getAttribute('href');
  expect(href).toContain('/pages/login.html');
});

test('Community Page: Load and grid present', async ({ page }) => {
  await page.goto(BASE_URL + '/pages/community.html');
  await expect(page.locator('body')).toHaveClass(/app-loaded/, { timeout: 10000 });

  const discoveryGrid = page.locator('#discovery-grid-demo, #discovery-grid');
  await expect(discoveryGrid.first()).toBeVisible({ timeout: 10000 });
});

  test('Owner Page: Management dashboard shell', async ({ page }) => {
    await page.goto(BASE_URL + '/pages/owner.html');
    await expect(page.locator('body')).toHaveClass(/app-loaded/, { timeout: 10000 });
    
    const treesTbody = page.locator('#owner-tree-tbody');
    await expect(treesTbody).toBeAttached();
  });

  test('Editor Page: Load without crash', async ({ page }) => {
    await page.goto(BASE_URL + '/pages/editor.html?id=bts');
    await expect(page.locator('body')).toHaveClass(/app-loaded/, { timeout: 15000 });
    
    const modeTreeBtn = page.locator('#mode-tree-btn');
    await expect(modeTreeBtn).toBeVisible();
  });

  test('Admin Page: Login overlay present', async ({ page }) => {
    await page.goto(BASE_URL + '/pages/admin.html');
    const loginOverlay = page.locator('#loginOverlay');
    await expect(loginOverlay).toBeAttached({ timeout: 10000 });
  });

test('Settings Modal: Attached to DOM', async ({ page }) => {
  await page.goto(BASE_URL + '/pages/owner.html');
  await expect(page.locator('body')).toHaveClass(/app-loaded/, { timeout: 10000 });

  const settingsModal = page.locator('#settings-modal');
  await expect(settingsModal).toBeAttached({ timeout: 10000 });
});
});
