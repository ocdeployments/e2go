import { test, expect } from '@playwright/test';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

test.describe('Public Routes', () => {
  test('/ - Landing page loads', async ({ page }) => {
    const response = await page.goto(BASE_URL + '/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).toBeVisible();
  });

  test('/quiz - Quiz page loads', async ({ page }) => {
    const response = await page.goto(BASE_URL + '/quiz');
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).toBeVisible();
  });

  test('/results - Results page loads', async ({ page }) => {
    const response = await page.goto(BASE_URL + '/results');
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).toBeVisible();
  });

  test('/pricing - Pricing page loads', async ({ page }) => {
    const response = await page.goto(BASE_URL + '/pricing');
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).toBeVisible();
  });

  test('/login - Login page loads', async ({ page }) => {
    const response = await page.goto(BASE_URL + '/login');
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).toBeVisible();
  });

  test('/signup - Signup page loads', async ({ page }) => {
    const response = await page.goto(BASE_URL + '/signup');
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Auth Protection', () => {
  test('GET /dashboard unauthenticated redirects to /login', async ({ page }) => {
    const response = await page.goto(BASE_URL + '/dashboard');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/.*\/login.*/);
  });
});

test.describe('API Security', () => {
  test('POST /api/ai unauthenticated returns 401', async ({ request }) => {
    const response = await request.post(BASE_URL + '/api/ai', {
      data: { message: 'test' }
    });
    expect(response.status()).toBe(401);
  });
});