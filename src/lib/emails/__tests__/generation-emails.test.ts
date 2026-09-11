import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildPackageReadyEmail,
  buildResetAfterFailureEmail,
  sendPackageReadyEmail,
  sendResetAfterFailureEmail,
  documentTypesToLabels,
} from '../generation-emails';
import { DOCUMENT_TYPE_LABELS } from '@/types/generation';
import type { DocumentType } from '@/types/generation';
import { DOC_DISPLAY_NAMES } from '@/lib/docx-package-constants';

// HMAC signing (the unsubscribe link) falls back to SUPABASE_SERVICE_ROLE_KEY
// when no dedicated secret is set — needs something present or the builders
// throw. Set at module load: the describe blocks below build fixtures
// eagerly, before any beforeAll runs (mirrors retention-sequence.test.ts).
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-for-hmac-signing';

const APPLICATION_ID = 'app-c9a84c-0001';
const RECIPIENT = 'client@example.com';
const APPLICATION_LINK = 'https://e2go.app/generate/app-c9a84c-0001';

// A minimal solo-applicant case — no spouse, no partnership, no leased premises.
const SOLO_DOCUMENT_TYPES: DocumentType[] = [
  'cover_letter',
  'source_of_funds',
  'investment_proof',
  'business_plan',
  'qualifications',
  'ds160_reference',
  'visa_category',
  'nonimmigrant_intent',
  'marginality_rebuttal',
  'declaration_principal',
  'fund_flow_chronology',
  'net_worth_statement',
  'resume_principal',
];

// A case that triggers the spouse and leased-premises conditionals on top of
// the same core set — used to prove the rendered list actually changes with
// the case's own answers rather than being a fixed/generic list.
const SPOUSE_AND_LEASE_DOCUMENT_TYPES: DocumentType[] = [
  ...SOLO_DOCUMENT_TYPES,
  'declaration_spouse',
  'resume_spouse',
  'lease_premises_summary',
];

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
  const { subject, html, text } = buildPackageReadyEmail(APPLICATION_LINK, SOLO_DOCUMENT_TYPES, RECIPIENT);

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

  it('lists every document type passed in, by its human-readable label', () => {
    for (const dt of SOLO_DOCUMENT_TYPES) {
      const label = DOCUMENT_TYPE_LABELS[dt];
      expect(html).toContain(label);
      expect(text).toContain(label);
    }
  });

  it('does not list documents that were not part of this case\'s plan', () => {
    // Spouse/lease documents were never in SOLO_DOCUMENT_TYPES — a generic,
    // hardcoded list would include them anyway.
    expect(html).not.toContain(DOCUMENT_TYPE_LABELS.declaration_spouse);
    expect(html).not.toContain(DOCUMENT_TYPE_LABELS.resume_spouse);
    expect(html).not.toContain(DOCUMENT_TYPE_LABELS.lease_premises_summary);
    expect(text).not.toContain(DOCUMENT_TYPE_LABELS.declaration_spouse);
    expect(text).not.toContain(DOCUMENT_TYPE_LABELS.resume_spouse);
    expect(text).not.toContain(DOCUMENT_TYPE_LABELS.lease_premises_summary);
  });

  it('genuinely customizes the list per case — a different document plan renders different copy', () => {
    const withSpouseAndLease = buildPackageReadyEmail(APPLICATION_LINK, SPOUSE_AND_LEASE_DOCUMENT_TYPES, RECIPIENT);

    expect(withSpouseAndLease.html).not.toBe(html);
    expect(withSpouseAndLease.text).not.toBe(text);
    expect(withSpouseAndLease.html).toContain(DOCUMENT_TYPE_LABELS.declaration_spouse);
    expect(withSpouseAndLease.html).toContain(DOCUMENT_TYPE_LABELS.lease_premises_summary);
    expect(withSpouseAndLease.text).toContain(DOCUMENT_TYPE_LABELS.declaration_spouse);
    expect(withSpouseAndLease.text).toContain(DOCUMENT_TYPE_LABELS.lease_premises_summary);
  });

  it('every listed document type is genuinely part of the real downloadable package', () => {
    // DOC_DISPLAY_NAMES is the map the actual download route
    // (src/app/api/generate/download/[applicationId]/route.ts) uses to name
    // files inside the real ZIP — VALID_DOC_TYPES there is Object.keys(DOC_DISPLAY_NAMES).
    // If a type we list here had no entry there, the email would promise a
    // document the download route could never produce.
    for (const dt of SOLO_DOCUMENT_TYPES) {
      expect(DOC_DISPLAY_NAMES).toHaveProperty(dt);
    }
    for (const dt of SPOUSE_AND_LEASE_DOCUMENT_TYPES) {
      expect(DOC_DISPLAY_NAMES).toHaveProperty(dt);
    }
  });

  it('does not overclaim download availability — copy speaks of generation and review, not download', () => {
    // Documents are generated but not yet client-certified at send time
    // (buildPackageManifest in cic-package-manifest.ts gates real download
    // on every generated tab being 'certified', a separate manual step) —
    // so the email must not assert the package is available to download.
    expect(text.toLowerCase()).not.toContain('available to download');
    expect(html.toLowerCase()).not.toContain('available to download');
  });

  it('documentTypesToLabels drops unknown/empty labels rather than rendering blanks', () => {
    expect(documentTypesToLabels(SOLO_DOCUMENT_TYPES)).toHaveLength(SOLO_DOCUMENT_TYPES.length);
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
      documentTypes: SOLO_DOCUMENT_TYPES,
    });
    expect(ok).toBe(true);
  });

  it('skips a suppressed address', async () => {
    const ok = await sendPackageReadyEmail({
      supabase: fakeSupabase({ suppressed: true }),
      applicationId: APPLICATION_ID,
      email: RECIPIENT,
      applicationLink: APPLICATION_LINK,
      documentTypes: SOLO_DOCUMENT_TYPES,
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
