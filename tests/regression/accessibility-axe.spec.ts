import { test, expect } from '@playwright/test';
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

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.locator('#login-email').fill('test-uk@example.com');
  await page.locator('#login-password').fill('TestUK2026!');
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL(/case-profile|apply/, { timeout: 15_000 });
}

const CRITICAL_IMPACTS = ['critical', 'serious'];

test.describe('accessibility floor — axe scan', () => {
  test('/results has no critical or serious axe violations', async ({ page }) => {
    await login(page);
    await page.goto('/results');

    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter(v => CRITICAL_IMPACTS.includes(v.impact ?? ''));

    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test('/documents has no critical or serious axe violations', async ({ page }) => {
    await login(page);
    await page.goto('/documents');

    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter(v => CRITICAL_IMPACTS.includes(v.impact ?? ''));

    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test('tabbing to an interactive element shows a visible focus ring', async ({ page }) => {
    await login(page);
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
