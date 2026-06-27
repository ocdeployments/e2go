const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleMessages = [];
  const errors = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({ type: msg.type(), text });
    if (msg.type() === 'error') {
      errors.push(text);
    }
  });

  page.on('pageerror', err => {
    errors.push(`Page error: ${err.message}`);
  });

  try {
    await page.goto('http://localhost:3000/generate/9f981747-e3e4-4941-9f86-9871f8117b66', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait a bit for any async errors
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: '/Users/owner/E2-go/screenshot-generate.png', fullPage: true });

    console.log('=== SCREENSHOT TAKEN ===');
    console.log(`URL: ${page.url()}`);
    console.log(`Title: ${await page.title()}`);

    console.log('\n=== CONSOLE MESSAGES ===');
    consoleMessages.forEach(m => console.log(`[${m.type}] ${m.text}`));

    console.log('\n=== ERRORS ===');
    if (errors.length === 0) {
      console.log('No errors found');
    } else {
      errors.forEach(e => console.log(e));
    }

    // Check for port 3002 specifically
    const port3002Errors = errors.filter(e => e.includes('3002'));
    console.log('\n=== PORT 3002 ERRORS ===');
    if (port3002Errors.length === 0) {
      console.log('No port 3002 errors found');
    } else {
      port3002Errors.forEach(e => console.log(e));
    }

  } catch (err) {
    console.log('NAVIGATION ERROR:', err.message);
  }

  await browser.close();
})();