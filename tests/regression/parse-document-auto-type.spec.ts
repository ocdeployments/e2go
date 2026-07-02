import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Regression test for the bug where /api/apply/parse-document returned 500
// "Failed to create upload record" whenever docType was 'auto' (the default
// UI selection — "Detect automatically"). Root cause: the uploaded_documents
// insert used the raw, unresolved docType, but the doc_type CHECK constraint
// (added in 20260630100000_case_intelligence_core.sql) does not accept 'auto'
// as a stored value — it must be resolved to a real type before the insert.
// See route.ts stage: 'uploaded_documents-insert'.

const FIXTURE_PATH = path.join(__dirname, '..', 'fixtures', 'test-resume.pdf');

test.describe('parse-document — auto document type', () => {
  test('docType=auto does not violate the uploaded_documents CHECK constraint', async ({ page }) => {
    test.setTimeout(60_000); // real LLM extraction call — can take 10-20s

    await page.goto('/login');
    await page.locator('#login-email').fill('test-uk@example.com');
    await page.locator('#login-password').fill('TestUK2026!');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await page.waitForURL(/case-profile|apply/, { timeout: 15_000 });

    const fileBuffer = fs.readFileSync(FIXTURE_PATH);

    // Use page.request (not the top-level request fixture) so the
    // authenticated Supabase session cookies from the login above are sent.
    const response = await page.request.post('/api/apply/parse-document', {
      multipart: {
        file: {
          name: 'test-resume.pdf',
          mimeType: 'application/pdf',
          buffer: fileBuffer,
        },
        docType: 'auto',
      },
    });

    expect(response.status(), await response.text()).toBe(200);

    const body = await response.json();
    expect(body.docId).toBeTruthy();
    // 'auto' must never be persisted — it should have been resolved to a real type.
    expect(body.docType).not.toBe('auto');
    expect(Array.isArray(body.fields)).toBe(true);
    // Regression guard for the reasoning-token-starvation bug: a reasoning
    // model (e.g. gemini-2.5-pro) can return HTTP 200 with empty content if
    // its hidden "thinking" tokens aren't budgeted for, silently zeroing out
    // extraction. A real resume must yield at least one extracted field.
    expect(body.fields.length).toBeGreaterThan(0);
  });
});
