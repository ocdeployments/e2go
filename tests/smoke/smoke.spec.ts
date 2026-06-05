import { test, expect } from '@playwright/test'
import { SMOKE_ROUTES } from '@/lib/smoke'

test.describe('Smoke Tests', () => {
  for (const route of SMOKE_ROUTES) {
    test(`${route.name} returns ${route.expectedStatus}`, async ({ request }) => {
      const r = await request.get(
        `http://localhost:3001${route.path}`,
        { maxRedirects: 0 }
      )
      expect(r.status()).toBe(route.expectedStatus)
    })
  }
})