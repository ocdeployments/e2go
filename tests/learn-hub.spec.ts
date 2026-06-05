import { test, expect } from '@playwright/test';

test('Learn hub page renders 6 article cards correctly', async ({ page }) => {
  await page.goto('http://localhost:3000/learn');

  // Check headline
  const headline = page.locator('h1');
  await expect(headline).toContainText('Learn About the');

  // Check 6 articles are visible
  const cards = page.locator('a').filter({ hasText: 'Read article' });
  await expect(cards).toHaveCount(6);

  // Verify specific article titles
  await expect(page.locator('text=What is the E-2 Treaty Investor Visa?')).toBeVisible();
  await expect(page.locator('text=The E-2 Visa for Canadian Citizens')).toBeVisible();
  await expect(page.locator('text=How Much Do You Need to Invest for an E-2 Visa?')).toBeVisible();

  // Take screenshot of hub
  await page.screenshot({ path: 'tests/screenshots/learn-hub.png', fullPage: true });
});

test('Learn article page renders correctly with Obsidian Gold design', async ({ page }) => {
  await page.goto('http://localhost:3000/learn/what-is-e2-visa');

  // Check headline
  const headline = page.locator('h1');
  await expect(headline).toContainText('What is the E-2 Treaty Investor Visa?');

  // Check read time
  await expect(page.locator('text=4 min read')).toBeVisible();

  // Check CTA
  const cta = page.locator('a', { hasText: 'Check your eligibility' });
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute('href', '/quiz');

  // Take screenshot of article
  await page.screenshot({ path: 'tests/screenshots/learn-article.png', fullPage: true });
});
