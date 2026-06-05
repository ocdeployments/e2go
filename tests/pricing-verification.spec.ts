import { test, expect } from '@playwright/test';

test.describe('Pricing Page Tier Pre-selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/pricing');
  });

  test('shows no pre-selection when no quiz data exists', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('e2go_quiz_result');
    });
    await page.reload();

    // Should show the quiz prompt
    await expect(page.locator('text=Take our eligibility quiz')).toBeVisible();

    // No card should have "Your plan" label
    const highlightedCards = page.locator('[data-selected="true"]');
    await expect(highlightedCards).toHaveCount(0);

    await page.screenshot({ path: 'test-results/pricing-no-data.png', fullPage: true });
  });

  test('highlights solo + spouse tier when quiz data indicates it', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('e2go_quiz_result', JSON.stringify({
        answers: {
          'Q0-09': 'I am the sole owner',
          'Q0-16': 'spouse_only'
        }
      }));
    });
    await page.reload();

    // Should highlight Solo + Spouse
    const spouseCard = page.locator('text=Solo + Spouse').first();
    await expect(spouseCard).toBeVisible();

    // The card should show the "Selected" button state indicating it's highlighted
    await expect(page.locator('button:has-text("Selected")')).toBeVisible();

    await page.screenshot({ path: 'test-results/pricing-solo-spouse.png', fullPage: true });
  });

  test('highlights partnership families tier when quiz data indicates it', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('e2go_quiz_result', JSON.stringify({
        answers: {
          'Q0-09': 'Two equal 50/50 owners',
          'Q0-16': 'spouse_and_children'
        }
      }));
    });
    await page.reload();

    // Should highlight Partnership + Families
    await expect(page.locator('text=Partnership + Families')).toBeVisible();
    await expect(page.locator('button:has-text("Selected")')).toBeVisible();

    await page.screenshot({ path: 'test-results/pricing-partnership-families.png', fullPage: true });
  });

  test('allows user to manually select a different tier', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('e2go_quiz_result', JSON.stringify({
        answers: {
          'Q0-09': 'I am the sole owner',
          'Q0-16': 'spouse_only'
        }
      }));
    });
    await page.reload();

    // Initial highlight is Solo + Spouse
    await expect(page.locator('button:has-text("Selected")')).toBeVisible();

    // Click on a different tier (e.g., Solo Family)
    await page.locator('button:has-text("Select Plan")').nth(2).click();

    // The label should now say "Selected plan"
    await expect(page.locator('text=Selected plan')).toBeVisible();

    await page.screenshot({ path: 'test-results/pricing-manual-override.png', fullPage: true });
  });
});
