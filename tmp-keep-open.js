const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  
  const page = await context.newPage();
  await page.goto('https://lovetree.limone.dev', { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: 'tmp/home-opened.png', fullPage: true });
  
  console.log('브라우저를 열었습니다. 로그인해 주세요.');
  console.log('로그인 완료 후 아무 키나 누르세요...');
  
  // Wait for user to log in
  await page.waitForTimeout(60000); // 60 seconds for user to log in
  
  await page.screenshot({ path: 'tmp/home-after-login.png', fullPage: true });
  console.log('스크린샷 저장 완료');
  
  await browser.close();
})();
