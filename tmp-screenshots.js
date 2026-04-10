const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  
  const pages = [
    { name: 'home', url: 'https://lovetree.limone.dev' },
    { name: 'community', url: 'https://lovetree.limone.dev/community.html' },
    { name: 'owner', url: 'https://lovetree.limone.dev/owner.html' },
    { name: 'editor', url: 'https://lovetree.limone.dev/editor.html?treeId=test123' },
    { name: 'admin', url: 'https://lovetree.limone.dev/admin.html' },
  ];

  for (const p of pages) {
    try {
      const page = await context.newPage();
      await page.goto(p.url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `tmp/${p.name}.png`, fullPage: true });
      console.log(`✅ ${p.name}: ${page.url()}`);
      await page.close();
    } catch (e) {
      console.log(`❌ ${p.name}: ${e.message}`);
    }
  }

  await browser.close();
  console.log('Done!');
})();
