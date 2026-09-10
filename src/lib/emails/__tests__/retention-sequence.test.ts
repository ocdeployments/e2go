import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildRetentionNoticeEmail,
  buildRetentionReminderEmail,
  buildRetentionCompletionEmail,
  sendRetentionNoticeEmail,
  sendRetentionReminderEmail,
  sendRetentionCompletionEmail,
} from '../retention-sequence';
import { verifyRetentionHoldToken } from '../retention-hold-token';

// HMAC signing (retention-hold link, unsubscribe link) falls back to
// SUPABASE_SERVICE_ROLE_KEY when no dedicated secret is set — both need
// something present or the builders throw. Set at module load: the
// describe blocks below build fixtures eagerly, before any beforeAll runs.
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-for-hmac-signing';

const APPLICATION_ID = 'app-c9a84c-0001';
const RECIPIENT = 'client@example.com';
const PURGE_DATE = new Date('2026-10-10T00:00:00Z');

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

describe('buildRetentionNoticeEmail', () => {
  const { subject, html, text } = buildRetentionNoticeEmail(PURGE_DATE, RECIPIENT);

  it('states the purge date in both html and text bodies', () => {
    expect(html).toContain('10 October 2026');
    expect(text).toContain('10 October 2026');
  });

  it('has a subject describing removal, not a placeholder', () => {
    expect(subject).toBe('When your uploaded files will be removed');
  });

  it('tells the recipient contact data and application survive', () => {
    expect(html).toContain('Your application, your generated documents, and your contact details are unaffected');
    expect(text).toContain('Your application, your generated documents, and your contact details are unaffected');
  });

  it('wires the standard unsubscribe link via getBaseHtml', () => {
    expect(html).toContain('/unsubscribe?');
  });

  it('has no unresolved placeholders', () => {
    assertNoUnresolvedPlaceholders(subject, html, text);
  });
});

describe('buildRetentionReminderEmail', () => {
  const appUrl = 'https://e2go.app';
  const { subject, html, text } = buildRetentionReminderEmail(APPLICATION_ID, PURGE_DATE, appUrl, RECIPIENT);

  it('states the same purge date as the notice email', () => {
    expect(html).toContain('10 October 2026');
    expect(text).toContain('10 October 2026');
  });

  it('has a subject naming the 3-day window', () => {
    expect(subject).toBe('Your uploaded files are removed in 3 days');
  });

  it('includes a working confirm-to-keep link', () => {
    const match = html.match(/href="(https:\/\/e2go\.app\/retention\/confirm-hold\?a=[^"&]+&s=[^"]+)"/);
    expect(match).not.toBeNull();

    const url = new URL(match![1]);
    const a = url.searchParams.get('a');
    const s = url.searchParams.get('s');
    expect(a).toBe(APPLICATION_ID);
    expect(verifyRetentionHoldToken(a!, s!)).toBe(APPLICATION_ID);

    // The plain-text body carries the same link for clients that strip HTML.
    expect(text).toContain(url.toString());
  });

  it('tells the recipient contact data and application survive', () => {
    expect(html).toContain('Your application, your generated documents, and your contact details are unaffected');
  });

  it('has no unresolved placeholders', () => {
    assertNoUnresolvedPlaceholders(subject, html, text);
  });
});

describe('buildRetentionCompletionEmail', () => {
  it('uses singular "file" for a count of one', () => {
    const { subject, html, text } = buildRetentionCompletionEmail(1, RECIPIENT);
    expect(subject).toBe('Your uploaded files have been removed');
    expect(html).toContain('1 uploaded file');
    expect(text).toContain('1 uploaded file');
    expect(html).not.toContain('1 uploaded files');
    assertNoUnresolvedPlaceholders(subject, html, text);
  });

  it('uses plural "files" for a count greater than one', () => {
    const { html, text } = buildRetentionCompletionEmail(4, RECIPIENT);
    expect(html).toContain('4 uploaded files');
    expect(text).toContain('4 uploaded files');
    assertNoUnresolvedPlaceholders(html, text);
  });

  it('tells the recipient contact data and application survive', () => {
    const { html } = buildRetentionCompletionEmail(2, RECIPIENT);
    expect(html).toContain('Your application, your generated documents, and your contact details are unaffected');
  });
});

/**
 * Minimal chainable Supabase stand-in. Every send function here only ever
 * reads email_suppressions via .select().eq().maybeSingle() and writes
 * applications via .update().eq() — matching partnership-hold.test.ts's
 * pattern for the read side, extended with a resolvable update() chain.
 */
function fakeSupabase(opts: { suppressed?: boolean } = {}) {
  const updateCalls: Array<{ table: string; fields: Record<string, unknown>; id: string }> = [];

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
      if (table === 'applications') {
        return {
          update: (fields: Record<string, unknown>) => ({
            eq: async (_col: string, id: string) => {
              updateCalls.push({ table, fields, id });
              return { error: null };
            },
          }),
        };
      }
      throw new Error(`fakeSupabase: unexpected table "${table}"`);
    },
  };

  return { supabase: client as unknown as SupabaseClient, updateCalls };
}

describe('sendRetentionNoticeEmail', () => {
  it('stamps retention_notice_sent_at and reports success when not suppressed', async () => {
    const { supabase, updateCalls } = fakeSupabase();
    const ok = await sendRetentionNoticeEmail({
      supabase,
      applicationId: APPLICATION_ID,
      email: RECIPIENT,
      purgeDate: PURGE_DATE,
    });
    expect(ok).toBe(true);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].id).toBe(APPLICATION_ID);
    expect(updateCalls[0].fields.retention_notice_sent_at).toEqual(expect.any(String));
  });

  it('skips a suppressed address without stamping anything', async () => {
    const { supabase, updateCalls } = fakeSupabase({ suppressed: true });
    const ok = await sendRetentionNoticeEmail({
      supabase,
      applicationId: APPLICATION_ID,
      email: RECIPIENT,
      purgeDate: PURGE_DATE,
    });
    expect(ok).toBe(false);
    expect(updateCalls).toHaveLength(0);
  });
});

describe('sendRetentionReminderEmail', () => {
  it('stamps retention_reminder_sent_at when not suppressed', async () => {
    const { supabase, updateCalls } = fakeSupabase();
    const ok = await sendRetentionReminderEmail({
      supabase,
      applicationId: APPLICATION_ID,
      email: RECIPIENT,
      purgeDate: PURGE_DATE,
    });
    expect(ok).toBe(true);
    expect(updateCalls[0].fields.retention_reminder_sent_at).toEqual(expect.any(String));
  });

  it('skips a suppressed address', async () => {
    const { supabase, updateCalls } = fakeSupabase({ suppressed: true });
    const ok = await sendRetentionReminderEmail({
      supabase,
      applicationId: APPLICATION_ID,
      email: RECIPIENT,
      purgeDate: PURGE_DATE,
    });
    expect(ok).toBe(false);
    expect(updateCalls).toHaveLength(0);
  });
});

describe('sendRetentionCompletionEmail', () => {
  it('stamps retention_purge_notice_sent_at when not suppressed', async () => {
    const { supabase, updateCalls } = fakeSupabase();
    const ok = await sendRetentionCompletionEmail({
      supabase,
      applicationId: APPLICATION_ID,
      email: RECIPIENT,
      purgedFileCount: 3,
    });
    expect(ok).toBe(true);
    expect(updateCalls[0].fields.retention_purge_notice_sent_at).toEqual(expect.any(String));
  });

  it('skips a suppressed address', async () => {
    const { supabase, updateCalls } = fakeSupabase({ suppressed: true });
    const ok = await sendRetentionCompletionEmail({
      supabase,
      applicationId: APPLICATION_ID,
      email: RECIPIENT,
      purgedFileCount: 3,
    });
    expect(ok).toBe(false);
    expect(updateCalls).toHaveLength(0);
  });
});
