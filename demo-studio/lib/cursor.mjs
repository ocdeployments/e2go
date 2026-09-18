/**
 * Synthetic cursor.
 *
 * Playwright renders no pointer into its video capture, so without this every
 * film shows a UI that operates itself — menus opening, fields filling, nothing
 * touching them. The effect is uncanny and it reads as a fake.
 *
 * Two cursors run in parallel:
 *
 *   - The VISUAL cursor is a DOM element tweened with requestAnimationFrame
 *     inside the page. It is what the camera sees. Running the tween in-page
 *     rather than stepping it from Node keeps motion at display framerate
 *     instead of at the speed of the CDP round trip.
 *
 *   - The REAL Playwright mouse is moved to the destination so the application
 *     actually responds — hover states, focus, clicks. It does not need to be
 *     smooth because it is invisible.
 *
 * Both land on the same coordinate at the same time.
 */

const RING = 12; // px, per the motion spec

/**
 * Inject the cursor element and its in-page animation runtime.
 *
 * Takes a Page or a BrowserContext — both expose addInitScript, and passing the
 * context installs the cursor on every page it opens. Using addInitScript rather
 * than injecting after load means the cursor survives navigation; a film crosses
 * several routes and re-installing per page would drop it at every boundary.
 */
export async function installCursor(pageOrContext) {
  await pageOrContext.addInitScript(
    ({ ring }) => {
      const ID = '__e2cursor';

      function install() {
        if (document.getElementById(ID)) return;
        const el = document.createElement('div');
        el.id = ID;
        el.setAttribute('aria-hidden', 'true');
        el.style.cssText = [
          'position:fixed',
          'left:0',
          'top:0',
          `width:${ring}px`,
          `height:${ring}px`,
          `margin:${-ring / 2}px 0 0 ${-ring / 2}px`,
          'border:1.5px solid #C9A84C',
          'border-radius:50%',
          'background:rgba(201,168,76,0.15)',
          'box-shadow:0 0 12px rgba(201,168,76,0.55)',
          'opacity:0',
          'pointer-events:none',
          'z-index:2147483647',
          'will-change:transform,opacity',
          'transform:translate3d(-100px,-100px,0)',
        ].join(';');
        document.documentElement.appendChild(el);
      }

      // State lives on window so successive Node calls share one position.
      window.__e2c = window.__e2c || { x: -100, y: -100, busy: false };

      function el() {
        return document.getElementById(ID);
      }

      function paint(x, y) {
        const e = el();
        if (e) e.style.transform = `translate3d(${x}px,${y}px,0)`;
      }

      // easeInOutCubic — human pointing accelerates out and settles in.
      function ease(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      }

      window.__e2cShow = function (on) {
        const e = el();
        if (e) e.style.opacity = on ? '0.9' : '0';
      };

      window.__e2cMove = function (tx, ty, duration) {
        return new Promise((resolve) => {
          const s = window.__e2c;
          const sx = s.x;
          const sy = s.y;
          const dx = tx - sx;
          const dy = ty - sy;
          if (duration <= 0 || (dx === 0 && dy === 0)) {
            s.x = tx;
            s.y = ty;
            paint(tx, ty);
            return resolve();
          }
          const t0 = performance.now();
          function frame(now) {
            const p = Math.min(1, (now - t0) / duration);
            const k = ease(p);
            const x = sx + dx * k;
            const y = sy + dy * k;
            paint(x, y);
            if (p < 1) {
              requestAnimationFrame(frame);
            } else {
              s.x = tx;
              s.y = ty;
              resolve();
            }
          }
          requestAnimationFrame(frame);
        });
      };

      window.__e2cPulse = function (duration) {
        return new Promise((resolve) => {
          const e = el();
          if (!e) return resolve();
          const s = window.__e2c;
          const t0 = performance.now();
          function frame(now) {
            const p = Math.min(1, (now - t0) / duration);
            // Out and back: 1 -> 1.4 -> 1, with a dip in opacity on the way out.
            const scale = 1 + 0.4 * Math.sin(p * Math.PI);
            e.style.transform = `translate3d(${s.x}px,${s.y}px,0) scale(${scale})`;
            e.style.opacity = String(0.9 - 0.35 * Math.sin(p * Math.PI));
            if (p < 1) requestAnimationFrame(frame);
            else {
              e.style.transform = `translate3d(${s.x}px,${s.y}px,0)`;
              e.style.opacity = '0.9';
              resolve();
            }
          }
          requestAnimationFrame(frame);
        });
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', install);
      } else {
        install();
      }
    },
    { ring: RING }
  );
}

/** Fade the cursor in or out. Films start with it hidden until first use. */
export async function showCursor(page, on = true) {
  await page.evaluate((v) => window.__e2cShow && window.__e2cShow(v), on);
}

/**
 * Move the visual cursor and the real mouse to a viewport coordinate.
 * The in-page tween and the Node-side wait run concurrently so they finish together.
 */
export async function moveTo(page, x, y, { duration = 600 } = {}) {
  await Promise.all([
    page.evaluate(
      ({ x, y, d }) => window.__e2cMove && window.__e2cMove(x, y, d),
      { x, y, d: duration }
    ),
    // A midpoint move keeps hover states from snapping on only at the end.
    (async () => {
      await page.waitForTimeout(Math.max(0, duration * 0.55));
      await page.mouse.move(x, y);
    })(),
  ]);
  await page.mouse.move(x, y);
}

/** Centre of an element, in viewport coordinates. Null if it has no box. */
export async function centreOf(page, selector) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) return null;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Move to an element without clicking it — for hovers and near-misses. */
export async function moveToElement(page, selector, opts = {}) {
  const c = await centreOf(page, selector);
  if (!c) throw new Error(`cursor: no box for ${selector}`);
  await moveTo(page, c.x, c.y, opts);
  return c;
}

/**
 * Move to an element, pulse, and click it.
 * `settle` is the beat after the click before the scene continues — a real hand
 * does not move on the instant a click registers, and neither should this.
 */
export async function clickElement(page, selector, { duration = 600, settle = 260 } = {}) {
  const c = await moveToElement(page, selector, { duration });
  await Promise.all([
    page.evaluate(() => window.__e2cPulse && window.__e2cPulse(200)),
    page.mouse.click(c.x, c.y),
  ]);
  if (settle) await page.waitForTimeout(settle);
  return c;
}
