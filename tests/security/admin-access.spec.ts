import { test, expect } from '@playwright/test';

test.describe('Admin Access Control', () => {
  test('Unauthenticated user redirected from /admin', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('http://localhost:3000/admin');
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toMatch(/\/admin/);
  });

  test('Admin API returns 401 without auth', async ({ request }) => {
    const r = await request.get('http://localhost:3000/api/admin/applications');
    expect([401, 403]).toContain(r.status());
  });

  test('Protected app routes redirect unauthenticated users', async ({ page }) => {
    await page.context().clearCookies();
    const routes = ['/dashboard', '/score', '/simulator', '/apply/overview'];
    for (const route of routes) {
      await page.goto(`http://localhost:3000${route}`);
      await page.waitForLoadState('networkidle');
      expect(page.url()).not.toMatch(new RegExp(route));
    }
  });

  test('Apply route redirects unauthenticated users', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('http://localhost:3000/apply');
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toMatch(/\/apply($|\/)/);
  });
});