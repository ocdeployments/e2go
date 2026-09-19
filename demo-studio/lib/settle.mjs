/**
 * Settle helpers.
 *
 * The verification gate for every scene is: no FOUC, no unresolved spinner, no
 * empty state, no error toast. Most of those are timing failures, not logic
 * failures — the recorder simply started rolling too early.
 *
 * The repo has four data-testid attributes in total, all on /pricing, so none of
 * this can lean on test hooks. These helpers wait on observable browser state
 * instead: font loading, animation frames, network quiet, element geometry.
 */

/**
 * Wait for webfonts to finish loading.
 *
 * Non-negotiable before any frame is captured. Cormorant Garamond and DM Sans
 * arrive via next/font/google, so an early capture catches the fallback stack
 * and the shot is unusable — the whole brand reads as wrong typography.
 */
export async function waitForFonts(page, timeout = 10_000) {
  await page.waitForFunction(() => document.fonts && document.fonts.status === 'loaded', null, {
    timeout,
  });
}

/**
 * Wait until no CSS animation or transition has run for `quietMs`.
 *
 * The app animates on mount (fadeInUp, countUp, progress widths). Capturing
 * mid-entrance produces a half-faded frame. This watches for animation and
 * transition events and resolves once the page has been still for a beat.
 *
 * Infinite decorative loops — goldPulse, e2AskBreathe, e2LiveDot — never stop,
 * so they are excluded by name; waiting on them would hang forever.
 */
export async function waitForMotionQuiet(page, { quietMs = 500, timeout = 8000 } = {}) {
  await page
    .evaluate(
      ({ quietMs, timeout }) =>
        new Promise((resolve) => {
          const LOOPS = /goldPulse|goldPulseGlow|e2AskBreathe|e2LiveDot|e2Caret|gradient-rotate/i;
          let last = performance.now();
          const bump = (e) => {
            if (e.animationName && LOOPS.test(e.animationName)) return;
            last = performance.now();
          };
          const events = ['animationstart', 'animationend', 'transitionstart', 'transitionend'];
          events.forEach((n) => document.addEventListener(n, bump, true));
          const t0 = performance.now();
          const tick = () => {
            const now = performance.now();
            if (now - last >= quietMs || now - t0 >= timeout) {
              events.forEach((n) => document.removeEventListener(n, bump, true));
              return resolve();
            }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
      { quietMs, timeout }
    )
    .catch(() => {});
}

/** Wait for every <img> in view to have decoded. Prevents a pop-in mid-shot. */
export async function waitForImages(page, timeout = 8000) {
  await page
    .waitForFunction(
      () => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0),
      null,
      { timeout }
    )
    .catch(() => {});
}

/**
 * The standard pre-roll: land on a route and be certain it is camera-ready.
 * Every scene starts with this.
 */
export async function ready(page, { quietMs = 500 } = {}) {
  await page.waitForLoadState('domcontentloaded');
  await waitForFonts(page);
  await waitForImages(page);
  await page.waitForLoadState('networkidle').catch(() => {});
  await waitForMotionQuiet(page, { quietMs });
}

/**
 * An explicit held beat.
 *
 * Named rather than a bare waitForTimeout because holds are editorial decisions
 * that appear in the shot list, not incidental waits. When a hold length changes
 * it should be findable.
 */
export async function hold(page, ms) {
  await page.waitForTimeout(ms);
}

/**
 * Scroll so an element sits at a chosen fraction of viewport height, smoothly.
 *
 * Playwright's scrollIntoViewIfNeeded jumps instantly, which on camera is a cut,
 * not a move. This is a real smooth scroll the recorder can see.
 */
export async function scrollTo(page, selector, { position = 0.4, duration = 900 } = {}) {
  await page.evaluate(
    ({ selector, position, duration }) =>
      new Promise((resolve) => {
        const el = document.querySelector(selector);
        if (!el) return resolve();
        const rect = el.getBoundingClientRect();
        const target = window.scrollY + rect.top - window.innerHeight * position;
        const start = window.scrollY;
        const delta = target - start;
        const t0 = performance.now();
        const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
        function frame(now) {
          const p = Math.min(1, (now - t0) / duration);
          window.scrollTo(0, start + delta * ease(p));
          if (p < 1) requestAnimationFrame(frame);
          else resolve();
        }
        requestAnimationFrame(frame);
      }),
    { selector, position, duration }
  );
}

/**
 * Fail loudly if the frame contains anything that must never ship.
 *
 * Called at the end of every scene. A scene that trips this is discarded rather
 * than trimmed around in the edit — by the time footage reaches ffmpeg nobody is
 * reading the DOM any more.
 */
export async function assertClean(page, { allowEmpty = false } = {}) {
  const problems = await page.evaluate((allowEmpty) => {
    const found = [];
    const text = document.body.innerText || '';

    if (/Application error|Unhandled Runtime Error|500|Something went wrong/i.test(text)) {
      found.push('error text on page');
    }
    if (!allowEmpty && /No documents have been generated yet|Nothing here yet/i.test(text)) {
      found.push('empty state on page');
    }
    // A spinner still turning means the shot was taken too early.
    const spinners = document.querySelectorAll('[class*="animate-spin"],[role="progressbar"]');
    if (spinners.length > 0) found.push(`${spinners.length} spinner(s) still visible`);

    return found;
  }, allowEmpty);

  if (problems.length) {
    throw new Error(`scene is not clean: ${problems.join('; ')}`);
  }
}
