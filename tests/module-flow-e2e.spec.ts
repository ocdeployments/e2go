import { test, expect } from '@playwright/test';

test.describe('End-to-End Flow: Module 1 -> Module 2 -> Module 3', () => {
  test('completes onboarding and business advisor flow', async ({ page }) => {
    // 1. Start at quiz and complete it (mocked or actual if auth bypassed)
    // Using demo bypass or existing test auth flow
    await page.goto('/apply/module1?demo=true');

    // 2. Module 1 - Screen 1: Welcome + Application Type
    await expect(page.locator('text=Module 1 — Onboarding')).toBeVisible();
    await page.locator('button', { hasText: 'partnership' }).click();
    await page.locator('input[placeholder="Enter partner\'s legal name"]').fill('Test Partner');
    await page.locator('input[placeholder="partner@example.com"]').fill('partner@test.com');
    await page.locator('button', { hasText: 'Begin my application' }).click();

    // 3. Module 1 - Screen 2: Terms + Privacy
    await expect(page.locator('text=Terms & Data Retention')).toBeVisible();
    await page.locator('text=I have read and agree to the').first().click(); // Tos
    await page.locator('text=I have read and agree to the').nth(1).click(); // Privacy
    await page.locator('button', { hasText: 'Continue' }).first().click();

    // 4. Module 1 - Screen 3: CASL
    await expect(page.locator('text=Stay informed')).toBeVisible();
    await page.locator('button', { hasText: 'Yes, keep me informed' }).click();
    await page.locator('button', { hasText: 'Continue' }).first().click();

    // 5. Module 1 - Screen 4: Referral Consent
    await expect(page.locator('text=Connect you with the right experts')).toBeVisible();
    await page.locator('text=Franchise Consultant').click();
    await page.locator('button', { hasText: 'Continue' }).first().click();

    // 6. Module 1 - Screen 5: Family Composition
    await expect(page.locator('text=Family Composition')).toBeVisible();
    await page.locator('button', { hasText: 'Couple' }).click();
    await page.locator('button', { hasText: 'Confirm and Continue' }).click();

    // 7. Module 1 - Screen 6: Saving (Auto-redirects)
    await expect(page.locator('text=Creating your application record')).toBeVisible();

    // Wait for redirect to Module 2
    await page.waitForURL('**/apply/module2', { timeout: 10000 });

    // 8. Module 2 - Screen 1: Background
    await expect(page.locator('text=Your Professional Background')).toBeVisible();
    await page.locator('button', { hasText: 'Management / Operations' }).click();
    await page.locator('button', { hasText: '$100K – $150K' }).click();
    await page.locator('button', { hasText: 'Florida' }).click();
    await page.locator('button', { hasText: 'I am open to a franchise' }).click();
    await page.locator('button', { hasText: 'Continue' }).first().click();

    // 9. Module 2 - Screen 2: Categories
    await expect(page.locator('text=Select Up to 3 Categories')).toBeVisible();
    await page.locator('button', { hasText: 'Senior Care (Non-Medical)' }).click();
    await page.locator('button', { hasText: 'Retail Store' }).click();
    await page.locator('button', { hasText: 'Continue' }).first().click();

    // 10. Module 2 - Screen 3: Shortlist
    await expect(page.locator('text=Your Business Shortlist')).toBeVisible();
    await page.locator('button', { hasText: 'Save' }).first().click();
    await page.locator('button', { hasText: 'Continue' }).first().click();

    // 11. Module 2 - Screen 4: Franchise Referral
    await expect(page.locator('text=Franchise Consultant Connection')).toBeVisible();
    await page.locator('button', { hasText: 'Yes, connect me' }).first().click();
    await page.locator('button', { hasText: 'Continue' }).first().click();

    // 12. Module 2 - Screen 5: Experience Gap
    await expect(page.locator('text=Experience Alignment')).toBeVisible();
    await page.locator('button', { hasText: 'Continue' }).first().click();

    // 13. Module 2 - Screen 6: Completion -> Redirects to Module 3
    await expect(page.locator('text=Here is what we know about your business plan')).toBeVisible();

    // Click to proceed
    await page.locator('button', { hasText: 'Start your application profile' }).click();

    // 14. Arrives at Module 3 Tab A
    await page.waitForURL('**/apply/module3/a', { timeout: 10000 });
    await expect(page.locator('text=DS-160 Reference')).toBeVisible();

    // Take full page screenshot of the final state
    await page.screenshot({ path: 'tests/screenshots/module-flow-complete.png', fullPage: true });
  });
});
