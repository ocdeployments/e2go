import { test, expect } from '@playwright/test';

test.describe('Confidence Score Integration', () => {
  test('shows unassessed state when no data exists', async ({ page }) => {
    await page.goto('http://localhost:3000/score');

    // Confirm unassessed state
    await expect(page.getByText('Not yet assessed')).toBeVisible();
    await expect(page.getByText('Complete Module 3 to generate your initial confidence score')).toBeVisible();

    await page.screenshot({ path: 'test-results/score-unassessed.png', fullPage: true });
  });

  test('shows loading or unassessed state gracefully', async ({ page }) => {
    // Since we don't have a real backend with analysis data in this test,
    // we verify the UI renders the unassessed state gracefully.
    await page.goto('http://localhost:3000/score');

    // Wait for network to be idle
    await page.waitForLoadState('networkidle');

    // Unassessed state should be present
    await expect(page.getByText('Not yet assessed')).toBeVisible();

    await page.screenshot({ path: 'test-results/score-page-loaded.png', fullPage: true });
  });
});
