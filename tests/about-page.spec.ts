import { test, expect } from '@playwright/test';

test('About page renders correctly with Obsidian Gold design', async ({ page }) => {
  await page.goto('http://localhost:3000/about');

  // Check headline
  const headline = page.locator('h1');
  await expect(headline).toContainText('Built for the journey, not just the documents.');
  await expect(headline).toHaveCSS('font-style', 'italic');

  // Check sections
  await expect(page.locator('text=Why e2go exists')).toBeVisible();
  await expect(page.locator('text=What we do and do not do')).toBeVisible();
  await expect(page.locator('text=The product')).toBeVisible();

  // Check CTA
  const cta = page.locator('a', { hasText: 'Check My Eligibility' });
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute('href', '/quiz');

  // Take screenshot
  await page.screenshot({ path: 'tests/screenshots/about-page.png', fullPage: true });
});
