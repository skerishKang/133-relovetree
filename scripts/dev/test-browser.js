const { chromium } = require('playwright');

const pages = [
  'https://lovetree.limone.dev/index.html',
  'https://lovetree.limone.dev/community.html',
  'https://lovetree.limone.dev/owner.html',
  'https://lovetree.limone.dev/editor.html',
  'https://lovetree.limone.dev/admin.html'
];

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`[${msg.type()}] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    errors.push(`[pageerror] ${err.message}`);
  });

  for (const url of pages) {
    console.log(`\n=== Testing: ${url} ===`);
    errors.length = 0;
    
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      console.log('Page loaded successfully');
      
      await page.waitForTimeout(2000);
      
      if (errors.length > 0) {
        console.log('Console errors:');
        errors.forEach(e => console.log('  ' + e));
      } else {
        console.log('No console errors');
      }
    } catch (err) {
      console.log('ERROR: ' + err.message);
    }
  }

  await browser.close();
}

test().catch(console.error);
