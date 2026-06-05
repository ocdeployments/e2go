import { test, expect } from '@playwright/test';

test('simulator start screen', async ({ page }) => {
  await page.goto('http://localhost:3000/simulator');

  // Should show the start screen
  await expect(page.locator('text=INTERVIEW SIMULATOR')).toBeVisible();
  await expect(page.locator('text=Practice Your Interview')).toBeVisible();

  // Should show mode buttons
  await expect(page.locator('text=Text mode')).toBeVisible();
  await expect(page.locator('text=Voice mode')).toBeVisible();

  // Should show session count
  await expect(page.locator('text=Sessions used:')).toBeVisible();
});