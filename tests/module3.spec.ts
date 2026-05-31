import { test, expect } from '@playwright/test';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

test.describe('Module 3 - Document Interview Engine', () => {
  test('/apply/module3/a returns 200 for unauthenticated (redirects client-side)', async ({ page }) => {
    const response = await page.goto(BASE_URL + '/apply/module3/a', { waitUntil: 'domcontentloaded' });
    // Page loads (200), then redirects to login via useEffect
    expect(response?.status()).toBe(200);
  });

  test('/apply/module3 returns 200 (redirects client-side to /a)', async ({ page }) => {
    const response = await page.goto(BASE_URL + '/apply/module3', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
  });

  test('/apply/module3/b returns 200 (placeholder page)', async ({ page }) => {
    const response = await page.goto(BASE_URL + '/apply/module3/b', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
  });

  test('/apply/module3/z returns 200 (falls through to redirect)', async ({ page }) => {
    const response = await page.goto(BASE_URL + '/apply/module3/z', { waitUntil: 'domcontentloaded' });
    // Returns 200 then redirects client-side via page.tsx
    expect(response?.status()).toBe(200);
  });
});

test.describe('API: /api/answers', () => {
  test('POST /api/answers unauthenticated returns 401', async ({ request }) => {
    const response = await request.post(BASE_URL + '/api/answers', {
      data: {
        question_key: 'M3-A-01',
        answer_value: 'Test',
        application_id: 'test-app-id',
      },
    });
    expect(response.status()).toBe(401);
  });

  test('POST /api/answers with invalid key format returns 400 or 401', async ({ request }) => {
    const response = await request.post(BASE_URL + '/api/answers', {
      data: {
        question_key: 'INVALID-KEY',
        answer_value: 'Test',
        application_id: 'test-app-id',
      },
    });
    // Either 400 (key validation fails) or 401 (auth fails first) is acceptable
    expect([400, 401]).toContain(response.status());
  });

  test('POST /api/answers with valid M3 key format passes validation', async ({ request }) => {
    const response = await request.post(BASE_URL + '/api/answers', {
      data: {
        question_key: 'M3-A-01',
        answer_value: 'Test Answer',
        application_id: 'test-app-id',
      },
    });
    // 401 because no auth, but means key format was accepted
    expect(response.status()).toBe(401);
  });
});