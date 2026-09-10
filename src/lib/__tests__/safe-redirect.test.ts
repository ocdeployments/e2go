import { safeRedirect } from '../safe-redirect';

// RS-8 (Gap G-17): safeRedirect is the single chokepoint for every `?next=`
// sink (login, signup, auth/callback, terms-required) — only a same-origin,
// single-leading-slash path may pass through unchanged.

describe('safeRedirect', () => {
  const FALLBACK = '/case-profile';

  it.each([
    ['https://evil.example', FALLBACK],
    ['http://evil.example', FALLBACK],
    ['//evil.example', FALLBACK],
    ['/\\evil.example', FALLBACK],
    ['javascript:alert(1)', FALLBACK],
    ['evil.example', FALLBACK],
    [null, FALLBACK],
    [undefined, FALLBACK],
    ['', FALLBACK],
    ['/dashboard', '/dashboard'],
    ['/apply/module2', '/apply/module2'],
  ])('safeRedirect(%p) -> %p', (input, expected) => {
    expect(safeRedirect(input, FALLBACK)).toBe(expected);
  });
});
