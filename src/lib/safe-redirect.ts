/**
 * Gap G-17: several redirect sinks passed a client-suppliable `?next=` value
 * straight to window.location.href / router.push, or interpolated it into
 * `${origin}${next}`. Both allow an open redirect: `//evil.example` is a
 * valid relative URL that browsers resolve as protocol-relative (same for
 * the backslash variant `/\evil.example`, which browsers normalize to `//`).
 *
 * Only a same-origin, single-leading-slash path is allowed through; anything
 * else falls back to the caller's own default route.
 */
export function safeRedirect(next: string | null | undefined, fallback: string): string {
  if (!next) return fallback;
  if (!next.startsWith('/')) return fallback;
  if (next.length > 1 && (next[1] === '/' || next[1] === '\\')) return fallback;
  return next;
}
