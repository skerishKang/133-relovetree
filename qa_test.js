const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  
  async function testPage(path) {
    const page = await context.newPage();
    let cssErrors = [];
    let consoleErrors = [];
    
    page.on('response', resp => {
      if (resp.status() >= 400 && resp.url().endsWith('.css')) {
        cssErrors.push(resp.url() + ' (' + resp.status() + ')');
      }
    });

    page.on('pageerror', err => {
        consoleErrors.push(err.message);
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    console.log(`\n--- Testing ${path} ---`);
    try {
      await page.goto(`http://localhost:8080${path}`, { waitUntil: 'load' });
      // wait a bit for any meta redirects
      await page.waitForTimeout(2000);
      console.log(`Final URL: ${page.url()}`);
      console.log(`CSS Errors: ${cssErrors.length > 0 ? cssErrors.join(', ') : 'None'}`);
      console.log(`Console Errors: ${consoleErrors.length > 0 ? consoleErrors.join(', ') : 'None'}`);
    } catch (e) {
      console.log(`Failed to load ${path}: ${e.message}`);
    }
    await page.close();
  }

  const pagesToTest = [
    '/pages/mobile-add-memory.html',
    '/pages/mobile-add-branch.html',
    '/pages/community.html',
    '/pages/lovetree.html',
    '/pages/login.html',
    '/pages/my-trees.html'
  ];

  for (const p of pagesToTest) {
    await testPage(p);
  }

  await browser.close();
})();
