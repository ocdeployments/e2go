/**
 * DR-12 (Gap G-09b), September 10, 2026 (Session 146).
 *
 * ARCHETYPE_DOC_GUIDANCE (generation-engine.ts) was written against a
 * Canadian applicant and hardcoded Canada/RRSP/TFSA in 11 places across all
 * four archetypes — not just the two lines in the franchise/buyer block the
 * sprint doc's literal text named. A Japanese, French, or British applicant's
 * nonimmigrant_intent prompt was telling the model to document Canadian ties
 * regardless of who was actually applying. buildArchetypeGuidance() now takes
 * the applicant's actual country (resolved from M3-A-05 via
 * resolveTreatyCountry) and localizeArchetypeGuidance() substitutes it in,
 * so these tests exercise that pure function directly across every
 * archetype/document combination rather than a live end-to-end run — the
 * same no-DI-seam constraint noted in document-plan.test.ts.
 */
import { buildArchetypeGuidance, localizeArchetypeGuidance, ARCHETYPE_DOC_GUIDANCE } from '../generation-engine';

const BANNED = [/\bCanada\b/, /\bCanadian\b/, /\bRRSP\b/, /\bTFSA\b/, /\bLIRA\b/, /\bprovincial health coverage\b/i];

const ARCHETYPES = Object.keys(ARCHETYPE_DOC_GUIDANCE);
function documentTypesFor(archetype: string): string[] {
  return Object.keys(ARCHETYPE_DOC_GUIDANCE[archetype]);
}

describe('buildArchetypeGuidance — non-Canadian personas carry no Canadian premise (DR-12)', () => {
  const personas = ['Japan', 'France', 'United Kingdom'];

  for (const country of personas) {
    describe(`${country} persona`, () => {
      for (const archetype of ARCHETYPES) {
        for (const documentType of documentTypesFor(archetype)) {
          it(`${archetype}/${documentType} prompt has no Canadian instrument names or premise`, () => {
            const guidance = buildArchetypeGuidance(archetype, documentType, country);
            for (const pattern of BANNED) {
              expect(guidance).not.toMatch(pattern);
            }
          });
        }
      }

      it('nonimmigrant_intent guidance mentions the applicant\'s actual country', () => {
        // Only archetypes whose nonimmigrant_intent block previously named
        // Canada should now name the persona's real country instead.
        for (const archetype of ARCHETYPES) {
          const guidance = buildArchetypeGuidance(archetype, 'nonimmigrant_intent', country);
          if (ARCHETYPE_DOC_GUIDANCE[archetype].nonimmigrant_intent.includes('Canada')) {
            expect(guidance).toContain(country);
          }
        }
      });
    });
  }

  it('free-text nationality aliases resolve before localization (uk / great britain)', () => {
    // buildArchetypeGuidance is called with whatever resolveTreatyCountry
    // hands back in generation-engine.ts — exercise the canonical form
    // directly here, since alias resolution itself is covered in
    // treaty-countries' own tests.
    const guidance = buildArchetypeGuidance('buyer', 'nonimmigrant_intent', 'United Kingdom');
    expect(guidance).toContain('United Kingdom');
    expect(guidance).not.toMatch(/\bCanada\b/);
  });

  it('a genuinely Canadian applicant keeps the original Canadian guidance unchanged', () => {
    for (const archetype of ARCHETYPES) {
      for (const documentType of documentTypesFor(archetype)) {
        const raw = ARCHETYPE_DOC_GUIDANCE[archetype][documentType];
        const guidance = buildArchetypeGuidance(archetype, documentType, 'Canada');
        expect(guidance).toBe(raw);
      }
    }
  });

  it('an unknown nationality (missing M3-A-05) still de-Canadianizes rather than defaulting to Canada', () => {
    const guidance = buildArchetypeGuidance('career_switcher', 'nonimmigrant_intent', null);
    expect(guidance).not.toMatch(/\bCanada\b/);
    expect(guidance).not.toMatch(/\bCanadian\b/);
    expect(guidance).not.toMatch(/\bRRSP\b/);
    expect(guidance).toContain("the applicant's home country");
  });
});

describe('localizeArchetypeGuidance — unit behavior', () => {
  it('passes non-Canadian text through unchanged when it contains no banned tokens', () => {
    const text = 'ARCHETYPE: INVESTOR\nNo home-country references here.';
    expect(localizeArchetypeGuidance(text, 'Japan')).toBe(text);
  });

  it('substitutes the real country for both noun and adjective forms of Canada', () => {
    const text = 'Document Canadian ties: property retained in Canada.';
    expect(localizeArchetypeGuidance(text, 'France')).toBe(
      'Document France-based ties: property retained in France.'
    );
  });

  it('replaces RRSP/TFSA/LIRA with generic account-type language', () => {
    const text = 'registered savings (RRSP, TFSA) and a LIRA drawdown';
    const result = localizeArchetypeGuidance(text, 'Japan');
    expect(result).toBe('registered savings (registered retirement plan, tax-advantaged savings account) and a locked-in retirement account drawdown');
  });

  it('returns the text unchanged for an actual Canadian applicant', () => {
    const text = 'Document Canadian ties: RRSP, TFSA, LIRA.';
    expect(localizeArchetypeGuidance(text, 'Canada')).toBe(text);
    expect(localizeArchetypeGuidance(text, 'canada')).toBe(text);
  });
});
