import { test, expect } from '@playwright/test';

test.describe('Site Navigation', () => {
  test('public nav renders correctly on desktop', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(1000);

    // Check nav container
    await expect(page.locator('header').first()).toBeVisible();

    // Check nav items (exact match to avoid landing page duplicates)
    await expect(page.getByRole('link', { name: 'How it works', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Pricing', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Learn', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Login', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start your eligibility check', exact: true }).first()).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/nav-desktop-public.png', fullPage: false });
  });

  test('public nav renders correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(1000);

    // Check hamburger menu (using class or first button in header)
    const header = page.locator('header').first();
    const hamburger = header.locator('button').first();
    await expect(hamburger).toBeVisible();

    // Open mobile menu
    await hamburger.click();
    await page.waitForTimeout(300);

    await expect(page.getByRole('link', { name: 'Start your eligibility check', exact: true })).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/nav-mobile-public.png', fullPage: false });
  });

  test('footer renders correctly with 3 columns', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(1000);

    // Check footer columns
    await expect(page.getByRole('heading', { name: 'Product' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Support' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Company' })).toBeVisible();

    // Check links
    await expect(page.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
    await expect(page.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');

    await page.screenshot({ path: 'tests/screenshots/footer-desktop.png', fullPage: false });
  });
});
