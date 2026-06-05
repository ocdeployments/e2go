import { test, expect } from '@playwright/test';

test('Cookie Banner is visible on landing page', async ({ page }) => {
  // Clear localStorage to ensure banner shows
  await page.context().clearCookies();

  await page.goto('http://localhost:3000');

  // Wait for the banner to be visible
  const banner = page.locator('div.z-50');
  await expect(banner).toBeVisible();

  // Check text content
  await expect(banner).toContainText('essential cookies for security and session management');
  await expect(banner).toContainText('anonymised analytics to improve the product');

  // Check buttons
  const acceptBtn = banner.locator('button', { hasText: 'Accept' });
  const learnMoreBtn = banner.locator('a', { hasText: 'Learn more' });

  await expect(acceptBtn).toBeVisible();
  await expect(learnMoreBtn).toBeVisible();

  // Test Accept functionality
  await acceptBtn.click();

  // Banner should be hidden after click
  await expect(banner).not.toBeVisible();

  // Reload to ensure it stays hidden (localStorage should have the value)
  await page.reload();
  await expect(banner).not.toBeVisible();
});

test('Cookie Banner takes screenshot', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('http://localhost:3000');

  // Wait for banner
  const banner = page.locator('div.z-50');
  await banner.waitFor({ state: 'visible' });

  // Take screenshot
  await page.screenshot({ path: 'tests/screenshots/cookie-banner-desktop.png', fullPage: true });

  // Test mobile viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000');
  await banner.waitFor({ state: 'visible' });
  await page.screenshot({ path: 'tests/screenshots/cookie-banner-mobile.png', fullPage: true });
});
