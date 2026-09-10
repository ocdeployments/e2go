import { test, expect } from '@playwright/test';

// Regression coverage for RS-9 (Gap G-18): before this, an unknown route or a
// thrown error inside the app fell through to Next's default boundary — no
// branding, no next step. Both branded pages must now render the locked
// Obsidian Gold palette/type stack and a working link out.
//
// /apply and /documents are both gated by middleware (payment/auth checks
// apply even to nonexistent sub-paths), so both cases log in first with the
// same seeded test account the other regression specs use.

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.locator('#login-email').fill('test-uk@example.com');
  await page.locator('#login-password').fill('TestUK2026!');
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL(/case-profile|apply/, { timeout: 15_000 });
}

test.describe('branded not-found and error pages', () => {
  test('an unknown /apply route renders the branded 404 with a working link', async ({ page }) => {
    await login(page);

    await page.goto('/apply/does-not-exist');

    const heading = page.getByRole('heading', { name: 'Page not found' });
    await expect(heading).toBeVisible();
    await expect(heading).toHaveCSS('font-family', /Cormorant Garamond/);

    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', 'rgb(10, 10, 10)');

    const dashboardLink = page.getByRole('link', { name: 'Return to dashboard' });
    await expect(dashboardLink).toHaveAttribute('href', '/dashboard');
  });

  test('a thrown error inside /documents renders the branded segment error page', async ({ page }) => {
    await login(page);

    // playwright.config.ts sends x-playwright-test: true on every request —
    // this route only throws when that header is present (see
    // src/app/documents/debug-error/page.tsx), so it 404s for real users.
    await page.goto('/documents/debug-error');

    const heading = page.getByRole('heading', { name: 'Something went wrong' });
    await expect(heading).toBeVisible();
    await expect(heading).toHaveCSS('font-family', /Cormorant Garamond/);

    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', 'rgb(10, 10, 10)');

    const dashboardLink = page.getByRole('link', { name: 'Return to dashboard' });
    await expect(dashboardLink).toHaveAttribute('href', '/dashboard');

    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});
