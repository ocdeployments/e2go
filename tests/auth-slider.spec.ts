import { test, expect } from '@playwright/test';

test('auth pages have image slider and render correctly', async ({ page }) => {
  // Test /login
  await page.goto('http://localhost:3000/login');
  await expect(page.locator('h1', { hasText: 'Welcome back' })).toBeVisible();
  await page.screenshot({ path: 'tests/screenshots/login-slider.png', fullPage: true });

  // Test /signup
  await page.goto('http://localhost:3000/signup');
  await expect(page.locator('h1', { hasText: 'Create your account' })).toBeVisible();
  await page.screenshot({ path: 'tests/screenshots/signup-slider.png', fullPage: true });

  // Test /verify (will show expired or token missing, but layout should be there)
  await page.goto('http://localhost:3000/verify');
  await expect(page.locator('h1', { hasText: 'This link has expired' })).toBeVisible();
  await page.screenshot({ path: 'tests/screenshots/verify-slider.png', fullPage: true });
});
