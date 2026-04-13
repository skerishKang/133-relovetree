import { test, expect } from '@playwright/test';

/**
 * Legacy Redirect Tests
 * Verify that old mobile add pages correctly redirect to the active mobile-tree page.
 */

test.describe('Legacy Mobile Add Pages Redirect', () => {
  const legacyPages = [
    { name: 'Add Memory', path: '/pages/mobile-add-memory.html' },
    { name: 'Add Branch', path: '/pages/mobile-add-branch.html' },
  ];

  for (const pageInfo of legacyPages) {
    test(`${pageInfo.name}: should redirect to mobile-tree.html`, async ({ page }) => {
      // Navigate to the legacy page
      await page.goto(pageInfo.path);
      // Wait for the meta refresh navigation to complete (allow up to 5 seconds)
      await page.waitForLoadState('domcontentloaded');
      // The URL should now be the target mobile-tree page
      await expect(page).toHaveURL(/\/pages\/mobile-tree\.html/);
      // Verify the app-loaded flag is present, indicating successful initialization
      await expect(page.locator('body')).toHaveClass(/app-loaded/, { timeout: 10000 });
    });
  }
});
