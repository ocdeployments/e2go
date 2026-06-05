import { test, expect } from '@playwright/test';

test.describe('Payment Wall Enforcement', () => {
  test('Module 3 redirects unauthenticated users', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('http://localhost:3000/apply/module3');
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toMatch(/\/apply\/module3$/);
  });

  test('Module 3 tabs redirect unauthenticated users', async ({ page }) => {
    await page.context().clearCookies();
    for (const tab of ['a', 'b', 'c', 'd']) {
      await page.goto(`http://localhost:3000/apply/module3/${tab}`);
      await page.waitForLoadState('networkidle');
      expect(page.url()).not.toMatch(new RegExp(`/apply/module3/${tab}`));
    }
  });

  test('Generate start API requires auth', async ({ request }) => {
    const r = await request.post('http://localhost:3000/api/generate/start', {
      data: { applicationId: 'test-id' }
    });
    expect([400, 401, 403]).toContain(r.status());
  });

  test('Download API requires auth', async ({ request }) => {
    const r = await request.get(
      'http://localhost:3000/api/generate/download/00000000-0000-0000-0000-000000000001'
    );
    expect([401, 403]).toContain(r.status());
  });

  test('Apply overview redirects unauthenticated users', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('http://localhost:3000/apply/overview');
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toMatch(/\/apply\/overview/);
  });

  test('Dashboard redirects unauthenticated users', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toMatch(/\/dashboard/);
  });
});