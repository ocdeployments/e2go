import { chromium } from 'playwright';

const EMAIL = 'ocdeployments@gmail.com';
const PASSWORD = 'Test1234!';

async function verify() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  try {
    // 1. Login
    console.log('--- Step 1: Login ---');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    // Wait for navigation after login
    await page.waitForTimeout(8000);
    const postLoginUrl = page.url();
    console.log(`Post-login URL: ${postLoginUrl}`);

    // 2. Navigate to /dashboard directly (ensure we're authenticated first)
    console.log('--- Step 2: Navigate to /dashboard ---');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
    // Wait for loading to resolve — look for real content
    await page.waitForSelector('h1', { timeout: 10000 });
    // Wait extra 3 seconds to confirm no flicker
    await page.waitForTimeout(3000);

    // Check if dashboard shows real content
    const dashboardContent = await page.textContent('body');
    const hasWelcome = dashboardContent.includes('Welcome back') || dashboardContent.includes('Start Your E-2 Application');
    const hasLoading = dashboardContent.includes('Loading...');

    console.log(`Dashboard has Welcome/Start content: ${hasWelcome}`);
    console.log(`Dashboard shows Loading...: ${hasLoading}`);

    // Screenshot dashboard
    await page.screenshot({ path: '/Users/owner/E2-go/docs/sessions/session30-dashboard.png', fullPage: true });
    console.log('Screenshot saved: session30-dashboard.png');

    // 3. Check for nav
    console.log('--- Step 3: Check nav ---');
    const navLinks = await page.$$eval('header a, nav a', links => links.map(l => l.textContent?.trim()));
    console.log(`Nav links found: ${navLinks.join(', ')}`);

    // 4. Navigate to /simulator directly
    console.log('--- Step 4: Navigate to /simulator ---');
    await page.goto('http://localhost:3000/simulator', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // Check simulator content
    const simulatorContent = await page.textContent('body');
    const hasSimulatorContent = simulatorContent.includes('INTERVIEW SIMULATOR') || simulatorContent.includes('Practice Your Interview') || simulatorContent.includes('Pressure-Test Your Interview Readiness');
    const hasSimLoading = simulatorContent.includes('Loading...');

    console.log(`Simulator has real content: ${hasSimulatorContent}`);
    console.log(`Simulator shows Loading...: ${hasSimLoading}`);

    // Screenshot simulator
    await page.screenshot({ path: '/Users/owner/E2-go/docs/sessions/session30-simulator.png', fullPage: true });
    console.log('Screenshot saved: session30-simulator.png');

    // 5. Check console for GoTrueClient warnings
    console.log('--- Step 5: Console analysis ---');
    const goTrueWarnings = consoleMessages.filter(m => m.includes('GoTrueClient') || m.includes('Multiple'));
    const tempLogs = consoleMessages.filter(m => m.includes('[SIM]') || m.includes('[dashboard]'));

    console.log(`GoTrueClient warnings: ${goTrueWarnings.length}`);
    goTrueWarnings.forEach(w => console.log(`  WARNING: ${w}`));
    console.log(`Temp debug logs: ${tempLogs.length}`);
    tempLogs.forEach(l => console.log(`  LOG: ${l}`));

    // Print all console messages for reference
    console.log('\n--- All console messages ---');
    consoleMessages.forEach(m => console.log(m));

  } catch (err) {
    console.error('Verification failed:', err.message);
    await page.screenshot({ path: '/Users/owner/E2-go/docs/sessions/session30-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

verify();
