import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildPackageReadyEmail,
  buildResetAfterFailureEmail,
  sendPackageReadyEmail,
  sendResetAfterFailureEmail,
} from '../generation-emails';

// HMAC signing (the unsubscribe link) falls back to SUPABASE_SERVICE_ROLE_KEY
// when no dedicated secret is set — needs something present or the builders
// throw. Set at module load: the describe blocks below build fixtures
// eagerly, before any beforeAll runs (mirrors retention-sequence.test.ts).
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-for-hmac-signing';

const APPLICATION_ID = 'app-c9a84c-0001';
const RECIPIENT = 'client@example.com';
const APPLICATION_LINK = 'https://e2go.app/generate/app-c9a84c-0001';

/** Any of {{...}}, ${...}, [object Object], undefined/null leaking into rendered copy. */
function assertNoUnresolvedPlaceholders(...rendered: string[]) {
  for (const text of rendered) {
    expect(text).not.toMatch(/\{\{.*?\}\}/);
    expect(text).not.toMatch(/\$\{.*?\}/);
    expect(text).not.toMatch(/\[object Object\]/);
    expect(text).not.toMatch(/\bundefined\b/);
    expect(text).not.toMatch(/\bNaN\b/);
  }
}

describe('buildPackageReadyEmail', () => {
  const { subject, html, text } = buildPackageReadyEmail(APPLICATION_LINK, RECIPIENT);

  it('has a subject naming the package as ready', () => {
    expect(subject).toBe('Your E2go.app document package is ready');
  });

  it('contains the application link in both html and text bodies', () => {
    expect(html).toContain(APPLICATION_LINK);
    expect(text).toContain(APPLICATION_LINK);
  });

  it('wires the standard unsubscribe link via getBaseHtml', () => {
    expect(html).toContain('/unsubscribe?');
  });

  it('has no unresolved placeholders', () => {
    assertNoUnresolvedPlaceholders(subject, html, text);
  });
});

describe('buildResetAfterFailureEmail', () => {
  const { subject, html, text } = buildResetAfterFailureEmail(APPLICATION_LINK, RECIPIENT);

  it('has a subject matching the sprint doc\'s specified copy', () => {
    expect(subject).toBe("Your package hit a snag — we've reset it");
  });

  it('tells the client to press generate again', () => {
    expect(html).toContain('Press generate again');
    expect(text).toContain('Press generate again');
  });

  it('contains the application link in both html and text bodies', () => {
    expect(html).toContain(APPLICATION_LINK);
    expect(text).toContain(APPLICATION_LINK);
  });

  it('wires the standard unsubscribe link via getBaseHtml', () => {
    expect(html).toContain('/unsubscribe?');
  });

  it('has no unresolved placeholders', () => {
    assertNoUnresolvedPlaceholders(subject, html, text);
  });
});

/**
 * Minimal chainable Supabase stand-in — only email_suppressions is ever
 * read by these send functions (neither stamps a dedup column; see the
 * module docstring in generation-emails.ts for why neither needs one).
 */
function fakeSupabase(opts: { suppressed?: boolean } = {}) {
  const client = {
    from(table: string) {
      if (table === 'email_suppressions') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: opts.suppressed ? { email: RECIPIENT } : null,
                error: null,
              }),
            }),
          }),
        };
      }
      throw new Error(`fakeSupabase: unexpected table "${table}"`);
    },
  };

  return client as unknown as SupabaseClient;
}

describe('sendPackageReadyEmail', () => {
  it('reports success when not suppressed', async () => {
    const ok = await sendPackageReadyEmail({
      supabase: fakeSupabase(),
      applicationId: APPLICATION_ID,
      email: RECIPIENT,
      applicationLink: APPLICATION_LINK,
    });
    expect(ok).toBe(true);
  });

  it('skips a suppressed address', async () => {
    const ok = await sendPackageReadyEmail({
      supabase: fakeSupabase({ suppressed: true }),
      applicationId: APPLICATION_ID,
      email: RECIPIENT,
      applicationLink: APPLICATION_LINK,
    });
    expect(ok).toBe(false);
  });
});

describe('sendResetAfterFailureEmail', () => {
  it('reports success when not suppressed', async () => {
    const ok = await sendResetAfterFailureEmail({
      supabase: fakeSupabase(),
      applicationId: APPLICATION_ID,
      email: RECIPIENT,
      applicationLink: APPLICATION_LINK,
    });
    expect(ok).toBe(true);
  });

  it('skips a suppressed address', async () => {
    const ok = await sendResetAfterFailureEmail({
      supabase: fakeSupabase({ suppressed: true }),
      applicationId: APPLICATION_ID,
      email: RECIPIENT,
      applicationLink: APPLICATION_LINK,
    });
    expect(ok).toBe(false);
  });
});
