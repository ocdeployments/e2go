import { test, expect } from '@playwright/test';

test('Landing page has correct SEO metadata and title', async ({ page }) => {
  await page.goto('http://localhost:3000');

  const title = await page.title();
  expect(title).toBe('e2go — E-2 Visa Preparation for Canadian Investors');

  const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
  expect(metaDescription).toContain('Prepare your complete E-2 visa application package');

  const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
  expect(ogTitle).toBe('e2go — E-2 Visa Preparation for Canadian Investors');

  const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(ogImage).toContain('/og-image.png');

  await page.screenshot({ path: 'tests/screenshots/seo-landing-page.png', fullPage: true });
});

test('Protected pages have noindex meta tag', async ({ page }) => {
  // We can't actually visit /dashboard without auth, but we can check /login
  await page.goto('http://localhost:3000/login');
  const robots = await page.locator('meta[name="robots"]').getAttribute('content');
  expect(robots).toBe('noindex, nofollow');
});
