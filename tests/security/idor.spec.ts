import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const FAKE_APP_ID = '00000000-0000-0000-0000-000000000001';

test.describe('IDOR Protection', () => {
  test('Unauthenticated request to documents returns 401', async ({ request }) => {
    const r = await request.get(`${BASE}/api/generate/documents/${FAKE_APP_ID}`);
    expect([401, 403]).toContain(r.status());
  });

  test('Unauthenticated download returns 401', async ({ request }) => {
    const r = await request.get(`${BASE}/api/generate/download/${FAKE_APP_ID}`);
    expect([401, 403]).toContain(r.status());
  });

  test('UUID enumeration returns 401/403/404 never 200 with data', async ({ request }) => {
    const uuids = [
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '11111111-1111-1111-1111-111111111111',
    ];
    for (const uuid of uuids) {
      const r = await request.get(`${BASE}/api/generate/documents/${uuid}`);
      expect([401, 403, 404]).toContain(r.status());
      if (r.status() === 200) {
        const body = await r.json();
        expect(body).not.toHaveProperty('documents');
        expect(body).not.toHaveProperty('content');
      }
    }
  });

  test('PATCH documents without auth returns 401', async ({ request }) => {
    const r = await request.patch(
      `${BASE}/api/generate/documents/${FAKE_APP_ID}`,
      { data: { status: 'approved' } }
    );
    expect([401, 403]).toContain(r.status());
  });

  test('POST generate/start without auth returns 401', async ({ request }) => {
    const r = await request.post(`${BASE}/api/generate/start`, {
      data: { applicationId: FAKE_APP_ID, userId: FAKE_APP_ID }
    });
    expect([400, 401, 403]).toContain(r.status());
  });

  test('Wrong user cannot access another user documents', async ({ request }) => {
    const r = await request.get(`${BASE}/api/generate/documents/${FAKE_APP_ID}`, {
      headers: {
        'Authorization': 'Bearer 99999999-9999-9999-9999-999999999999'
      }
    });
    const status = r.status();
    expect([401, 403, 404]).toContain(status);
  });
});