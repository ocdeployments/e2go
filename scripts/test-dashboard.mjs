import { chromium } from 'playwright';

const TEST_EMAIL = 'session29-test@e2go.test';
const TEST_PASSWORD = 'TestPass123!';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const logs = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  try {
    // 1. Login first
    console.log('1. Logging in...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for login to complete (any navigation away from /login)
    try {
      await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15000 });
      console.log('   Logged in. Now at:', page.url());
    } catch {
      console.log('   Login failed or stuck. URL:', page.url());
      await browser.close();
      return;
    }

    // 2. Navigate directly to /dashboard
    console.log('2. Navigating to /dashboard...');
    logs.length = 0; // Clear logs from login
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('   Dashboard page loaded. URL:', page.url());

    // 3. Monitor dashboard for up to 25 seconds
    console.log('3. Monitoring dashboard for content...');
    const startTime = Date.now();
    let resolved = false;

    try {
      await page.waitForFunction(() => {
        const text = document.body.innerText;
        return text.includes('Welcome back') || text.includes('Start Your E-2 Application');
      }, { timeout: 25000 });
      resolved = true;
    } catch {
      resolved = false;
    }

    const elapsed = Date.now() - startTime;
    console.log(`   Resolution after ${elapsed}ms: ${resolved ? 'RESOLVED' : 'STILL LOADING'}`);

    // 4. Take screenshot
    await page.screenshot({ path: 'scripts/dashboard-test.png', fullPage: true });
    console.log('4. Screenshot saved');

    // 5. Check page state
    const bodyText = await page.textContent('body');
    console.log('5. Page state:');
    console.log('   Loading... visible:', bodyText.includes('Loading...'));
    console.log('   Welcome back visible:', bodyText.includes('Welcome back'));
    console.log('   Start Your E-2 visible:', bodyText.includes('Start Your E-2'));
    console.log('   Nav links visible:', bodyText.includes('My Application') || bodyText.includes('Documents'));

    // 6. Print diagnostic logs
    console.log('\n--- DASH/NAV Diagnostic Logs ---');
    for (const log of logs) {
      if (log.includes('[DASH]') || log.includes('[NAV]')) {
        console.log(log);
      }
    }
    console.log('--- End ---');

    // 7. Print errors
    const errorLogs = logs.filter(l => l.includes('[error]'));
    if (errorLogs.length > 0) {
      console.log('\n--- Error Logs ---');
      for (const log of errorLogs) console.log(log);
    }

  } catch (err) {
    console.error('Test failed:', err.message);
    try { await page.screenshot({ path: 'scripts/dashboard-test-error.png', fullPage: true }); } catch {}
  } finally {
    await browser.close();
  }
})();
