const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  
  const page = await context.newPage();
  await page.goto('https://lovetree.limone.dev', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tmp/home-before-login.png', fullPage: true });
  
  // Find and click login button
  const loginBtn = await page.$('button:has-text("로그인"), #login-btn, [class*="login"]');
  if (loginBtn) {
    await loginBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tmp/login-modal.png', fullPage: true });
  }
  
  console.log('Current URL:', page.url());
  console.log('Title:', await page.title());
  
  await browser.close();
})();
