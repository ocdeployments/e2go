import { test, expect } from '@playwright/test';

const XSS_PAYLOADS = [
  '<script>window.__xss=true</script>',
  '<img src=x onerror="window.__xss=true">',
  '"><script>window.__xss=true</script>',
  '<svg onload="window.__xss=true">',
  'javascript:void(window.__xss=true)',
];

test.describe('XSS Protection', () => {
  for (const payload of XSS_PAYLOADS) {
    test(`XSS payload blocked: ${payload.substring(0,40)}`, async ({ page }) => {
      await page.goto('http://localhost:3000/quiz');
      await page.waitForLoadState('networkidle');
      const inputs = page.locator('input[type="text"], textarea');
      const count = await inputs.count();
      if (count === 0) return;
      await inputs.first().fill(payload);
      await inputs.first().blur();
      await page.waitForTimeout(500);
      const xss = await page.evaluate(() => (window as any).__xss);
      expect(xss).toBeFalsy();
    });
  }
});
