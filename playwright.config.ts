import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/security/**/*.spec.ts', '**/regression/**/*.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    extraHTTPHeaders: {
      'x-playwright-test': 'true',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so
    // overriding them only for `next start` has no effect on an already-built
    // .next folder — the test run needs its own build with the test keypair
    // baked in. reuseExistingServer stays true for local iteration; CI always
    // builds fresh.
    command: 'npx next build && npx next start -p 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
    timeout: 180_000,
    env: {
      ...process.env,
      // Cloudflare's dedicated "always passes" Turnstile test keypair — public,
      // documented at https://developers.cloudflare.com/turnstile/troubleshooting/testing/.
      // Overrides whatever real site is configured in .env.local so the widget
      // auto-completes for Playwright instead of blocking the Sign In button on
      // a real CAPTCHA challenge headless Chromium can't solve.
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
      TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
    },
  },
});