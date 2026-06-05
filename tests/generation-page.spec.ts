import { test, expect } from '@playwright/test';

test('generation page renders document cards with blur-lift', async ({ page }) => {
  await page.goto('http://localhost:3000/generate/test-123');

  await expect(page.locator('h1')).toContainText('Preparing Your Application Package');

  const docCards = page.locator('.relative.overflow-hidden.border.border-white\\/8');
  await expect(docCards).toHaveCount(6);

  const docNames = ['Cover Letter', 'Source of Funds', 'Investment Proof', 'Business Plan', 'Qualifications', 'DS-160 Reference'];
  for (const name of docNames) {
    await expect(page.locator('text=' + name).first()).toBeVisible();
  }

  const blurOverlays = page.locator('.backdrop-blur-3xl');
  await expect(blurOverlays).toHaveCount(6);

  await page.screenshot({ path: 'tests/screenshots/generation-page-init.png', fullPage: true });
});
