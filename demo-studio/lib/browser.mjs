/**
 * Recorder core.
 *
 * Deliberately does NOT use @playwright/test. The test runner owns context
 * creation and video lifecycle through fixtures, which is the wrong shape for a
 * camera: we need explicit control over frame size, when recording starts, and
 * what each file is called. Driving the library directly also guarantees this
 * rig never touches the repo's playwright.config.ts, whose testMatch is scoped
 * to security and regression suites.
 *
 * Playwright's video captures page content only — no URL bar, no tabs, no
 * profile chrome. There is nothing to crop and nothing to redact, and the
 * result reads as product rather than as somebody's screen share.
 */

import { chromium } from 'playwright';
import { mkdir, rm } from 'fs/promises';
import path from 'path';
import { installCursor } from './cursor.mjs';

export const RATIOS = {
  wide: { w: 1920, h: 1080 },
  // Shot natively rather than centre-cropped. The app carries 217 md: / 46 lg:
  // / 37 sm: breakpoint usages, so mobile is a designed layout, not a squeeze.
  vertical: { w: 1080, h: 1920 },
};

export const BASE_URL = process.env.DEMO_BASE_URL || 'http://localhost:3000';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const BUILD = path.join(ROOT, 'build');

/**
 * Record one scene to build/raw/<id>.<ratio>.webm.
 *
 * @param scene  { id, run(page, ctx), needsAuth?, allowEmpty? }
 * @param ratio  'wide' | 'vertical'
 * @param opts   { storageState, deviceScaleFactor, headless }
 */
export async function recordScene(scene, ratio = 'wide', opts = {}) {
  const { w, h } = RATIOS[ratio];
  if (!w) throw new Error(`unknown ratio: ${ratio}`);

  const rawDir = path.join(BUILD, 'raw');
  const tmpDir = path.join(BUILD, '.tmp', `${scene.id}.${ratio}`);
  await mkdir(rawDir, { recursive: true });
  await rm(tmpDir, { recursive: true, force: true });
  await mkdir(tmpDir, { recursive: true });

  const browser = await chromium.launch({
    headless: opts.headless !== false,
    args: [
      // Stabilises frame pacing in headless capture; without it the screencast
      // drops frames whenever the compositor decides the tab is idle.
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
      '--force-color-profile=srgb',
      '--hide-scrollbars',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: w, height: h },
    recordVideo: { dir: tmpDir, size: { width: w, height: h } },
    // Supersample, then let the encoder downsample. This is the cheapest
    // available answer to VP8 softening small serif text.
    deviceScaleFactor: opts.deviceScaleFactor ?? 2,
    colorScheme: 'dark',
    // The app's own animations ARE the film's motion vocabulary. globals.css
    // disables them under reduced-motion, which would flatten every shot.
    reducedMotion: 'no-preference',
    locale: 'en-US',
    timezoneId: 'America/Chicago',
    storageState: opts.storageState,
  });

  // Pre-dismiss the cookie banner. It renders on every route and would sit in
  // the lower third of literally every frame. Setting the key it already checks
  // (CookieBanner.tsx:9) means it never mounts, which is cleaner than filming a
  // click on it. "rejected" rather than "accepted": declining non-essential
  // cookies is the right default, and the demo account needs no analytics.
  await context.addInitScript(() => {
    try {
      localStorage.setItem('e2go_cookie_consent', 'rejected');
    } catch {
      /* private mode / storage disabled — banner will show; scene QA catches it */
    }
  });

  await installCursor(context);

  const page = await context.newPage();
  page.setDefaultTimeout(30_000);

  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));

  const video = page.video();
  let failure = null;

  try {
    await scene.run(page, { ratio, w, h, baseUrl: BASE_URL });
  } catch (err) {
    failure = err;
  }

  await context.close();
  await browser.close();

  const dest = path.join(rawDir, `${scene.id}.${ratio}.webm`);
  if (video) {
    await video.saveAs(dest).catch(() => {});
  }
  await rm(tmpDir, { recursive: true, force: true });

  if (failure) throw failure;

  return { path: dest, consoleErrors };
}
