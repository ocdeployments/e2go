import { test, expect } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// RS-11 (Gap G-20): the app had zero accessibility CI coverage — clickable
// divs with no keyboard affordance, no visible focus indicator anywhere.
// This scans the paid-path pages named in the sprint doc's exit criterion
// (/results, /documents) for critical/serious axe violations, and checks
// that tabbing to an interactive element produces a visible focus ring.
//
// test-uk@example.com is seeded (scripts/seed-test-profiles.mjs) as an
// already-paid "premium-clean" account, so it reaches /results and
// /documents directly post-login without driving a real Stripe checkout —
// the same account the not-found/error-page regression spec uses to reach
// /documents past the payment gate.

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#login-email').fill('test-uk@example.com');
  await page.locator('#login-password').fill('TestUK2026!');
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL(/case-profile|apply/, { timeout: 15_000 });
}

const CRITICAL_IMPACTS = ['critical', 'serious'];

test.describe('accessibility floor — axe scan', () => {
  // The login route is rate-limited to 5 attempts per 15 minutes per IP
  // (src/middleware.ts). Logging in once per test here — 3 tests, all from
  // the same localhost IP — combined with the other regression specs'
  // login() calls pushed a single full Playwright run over that limit, so
  // one test's /login page would be rate-limited rather than actually slow,
  // and no amount of extra timeout ever let it through. Sharing one
  // authenticated page across the file's tests keeps this file's login
  // count at 1 instead of 3.
  test.describe.configure({ mode: 'serial' });

  let context: BrowserContext;
  let page: Page;

  // AxeBuilder.analyze() opens a second page in the same context to run
  // axe.finishRun() — browser.newPage() marks its context as single-page-only
  // (Playwright throws "Please use browser.newContext()" if anything else
  // tries to open a page in it), so this needs an explicit context.
  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('/results has no critical or serious axe violations', async () => {
    await page.goto('/results');

    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter(v => CRITICAL_IMPACTS.includes(v.impact ?? ''));

    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test('/documents has no critical or serious axe violations', async () => {
    await page.goto('/documents');

    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter(v => CRITICAL_IMPACTS.includes(v.impact ?? ''));

    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test('tabbing to an interactive element shows a visible focus ring', async () => {
    await page.goto('/documents');

    await page.keyboard.press('Tab');

    const outline = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const style = window.getComputedStyle(el);
      return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
    });

    expect(outline).not.toBeNull();
    expect(outline?.outlineStyle).not.toBe('none');
    expect(outline?.outlineWidth).not.toBe('0px');
  });
});
