import { test, expect } from '@playwright/test'
const BASE = 'http://localhost:3001'

test.describe('Legal Disclaimer — No Forbidden Language', () => {
  test('/results has no guarantee language', async ({ page }) => {
    await page.goto(`${BASE}/results`)
    await page.waitForLoadState('networkidle')
    const content = await page.content()
    expect(content).not.toMatch(/you (are|will be) approved/i)
    expect(content).not.toMatch(/satisfies the requirement/i)
    expect(content).not.toMatch(/guaranteed/i)
  })
  test('/simulator has no guarantee language', async ({ page }) => {
    await page.goto(`${BASE}/simulator`)
    await page.waitForLoadState('networkidle')
    const content = await page.content()
    expect(content).not.toMatch(/guaranteed/i)
    expect(content).not.toMatch(/will pass/i)
    expect(content).not.toMatch(/will be approved/i)
  })
  test('/score has no eligibility determinations', async ({ page }) => {
    await page.goto(`${BASE}/score`)
    await page.waitForLoadState('networkidle')
    const content = await page.content()
    expect(content).not.toMatch(/you qualify/i)
    expect(content).not.toMatch(/you are eligible/i)
    expect(content).not.toMatch(/guaranteed/i)
  })
  test('/privacy exists and loads', async ({ page }) => {
    await page.goto(`${BASE}/privacy`)
    expect(page.url()).toContain('/privacy')
    const content = await page.content()
    expect(content.length).toBeGreaterThan(500)
  })
  test('/terms exists and loads', async ({ page }) => {
    await page.goto(`${BASE}/terms`)
    expect(page.url()).toContain('/terms')
    const content = await page.content()
    expect(content.length).toBeGreaterThan(500)
  })
})