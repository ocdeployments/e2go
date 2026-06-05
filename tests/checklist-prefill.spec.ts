import { test, expect } from '@playwright/test';

test.describe('Pre-Application Checklist Pre-fill', () => {

  test('shows personalised checklist for married solo + spouse + 1 child profile', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('e2go_quiz_result', JSON.stringify({
        answers: {
          'Q0-09': 'On my own',
          'Q0-16': 'Yes — my spouse and children',
          'Q0-17': 'Yes — we are legally married',
        }
      }));
    });
    await page.goto('http://localhost:3000/apply/checklist');

    // Confirm marriage cert, spouse docs, child docs visible
    await expect(page.getByText('Marriage certificate (certified/notarized copy)')).toBeVisible();
    await expect(page.getByText('Spouse\'s passport biographical page (copy)')).toBeVisible();
    await expect(page.getByText('Child\'s passport biographical page (copy)')).toBeVisible();

    // Confirm pre-fill notes appear on relevant items
    await expect(page.getByText('We know you are married from your eligibility check')).toBeVisible();

    // Confirm marriage certificate has cross-tab note
    await expect(page.getByText('Shared document').first()).toBeVisible();

    await page.screenshot({ path: 'test-results/checklist-married-spouse-child.png', fullPage: true });
  });

  test('shows minimal checklist for single no-family profile', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('e2go_quiz_result', JSON.stringify({
        answers: {
          'Q0-09': 'On my own',
          'Q0-16': 'No — just me'
        }
      }));
    });
    await page.goto('http://localhost:3000/apply/checklist');

    // Confirm no spouse or child items appear
    await expect(page.locator('text=Spouse\'s passport')).not.toBeVisible();
    await expect(page.locator('text=Child\'s passport')).not.toBeVisible();
    await expect(page.locator('text=Marriage certificate')).not.toBeVisible();

    // Confirm base items are present
    await expect(page.locator('text=Valid Canadian passport')).toBeVisible();
    await expect(page.locator('text=DS-160 confirmation page')).toBeVisible();

    await page.screenshot({ path: 'test-results/checklist-single.png', fullPage: true });
  });

  test('shows U.S.-based Change of Status profile correctly', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('e2go_quiz_result', JSON.stringify({
        answers: {
          'Q0-09': 'On my own',
          'Q0-16': 'No — just me',
          'Q0-03': 'In the United States'
        }
      }));
    });
    await page.goto('http://localhost:3000/apply/checklist');

    // Confirm I-94 is present
    await expect(page.getByText('I-94 record (print from i94.cbp.dhs.gov)')).toBeVisible();
    await expect(page.getByText('You indicated you are currently in the United States').first()).toBeVisible();

    // Confirm appointment letter and MRV receipt are NOT present
    await expect(page.getByText('Appointment confirmation letter')).not.toBeVisible();
    await expect(page.getByText('MRV fee receipt')).not.toBeVisible();

    await page.screenshot({ path: 'test-results/checklist-us-change-of-status.png', fullPage: true });
  });

  test('shows generic list with quiz prompt when no localStorage data', async ({ page }) => {
    await page.goto('http://localhost:3000/apply/checklist');

    // Confirm generic list with quiz prompt shown
    await expect(page.locator('text=Personalised Checklist Unavailable')).toBeVisible();
    await expect(page.locator('text=Take our eligibility quiz to see a personalised checklist')).toBeVisible();
    await expect(page.locator('a[href="/quiz"]')).toBeVisible();

    await page.screenshot({ path: 'test-results/checklist-no-data.png', fullPage: true });
  });

  test('removes pre-filled item and moves to hidden items section', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('e2go_quiz_result', JSON.stringify({
        answers: {
          'Q0-09': 'On my own',
          'Q0-16': 'Yes — my spouse or partner',
          'Q0-17': 'Yes — we are legally married'
        }
      }));
    });
    await page.goto('http://localhost:3000/apply/checklist');

    // Confirm pre-filled item is visible
    await expect(page.getByText('Spouse\'s passport biographical page (copy)')).toBeVisible();

    // Hover over the row to reveal the Remove button
    const spouseRow = page.locator('div.group').filter({ hasText: 'Spouse\'s passport biographical page (copy)' }).first();
    await spouseRow.hover();

    // Click Remove button
    await spouseRow.locator('button', { hasText: 'Remove' }).click();

    // Wait for the main list to update (item should be gone from main list)
    // We check that the Hidden items section appears and contains the item
    await expect(page.getByText('Hidden items (1)')).toBeVisible();

    // Expand hidden items
    await page.getByText('Hidden items (1)').click();

    // Confirm item is in hidden section and can be restored
    const hiddenSection = page.locator('div.divide-y.divide-\\[\\#C9A84C\\]\\/10.pb-4').first();
    await expect(hiddenSection.locator('button', { hasText: 'Restore' })).toBeVisible();

    await page.screenshot({ path: 'test-results/checklist-removed-item.png', fullPage: true });
  });
});