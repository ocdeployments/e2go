import { readFileSync } from 'fs';
import { join } from 'path';
import {
  SECURITY_HEALTH_QUESTIONS,
  SECURITY_CRIMINAL_QUESTIONS,
  SECURITY_MORAL_QUESTIONS,
  SECURITY_IMMIGRATION_QUESTIONS,
  SECURITY_SEVERE_QUESTIONS,
  US_POC_QUESTIONS,
  TRAVEL_COMPANIONS_QUESTIONS,
  APPLICATION_CONTACT_QUESTIONS,
  type QuestionField,
} from '@/lib/ds160-question-sets';
import { FIELD_REGISTRY, CARD_DEFINITIONS, getFieldDefinition } from '@/lib/field-registry';

// Guards src/lib/field-registry.ts (the single source of truth /api/case/completion
// and every card UI reads from) against silently drifting out of sync with its two
// upstream sources: src/lib/ds160-question-sets.ts (exported arrays — exact diff)
// and the six top-level apply pages (inline question literals — regex source scan,
// since those pages don't export their question arrays).

const DS160_FIELDS: QuestionField[] = [
  ...SECURITY_HEALTH_QUESTIONS,
  ...SECURITY_CRIMINAL_QUESTIONS,
  ...SECURITY_MORAL_QUESTIONS,
  ...SECURITY_IMMIGRATION_QUESTIONS,
  ...SECURITY_SEVERE_QUESTIONS,
  ...US_POC_QUESTIONS,
  ...TRAVEL_COMPANIONS_QUESTIONS,
  ...APPLICATION_CONTACT_QUESTIONS,
];

describe('field-registry vs ds160-question-sets', () => {
  it('registers every ds160-question-sets key', () => {
    const missing = DS160_FIELDS.map((q) => q.key).filter((key) => !getFieldDefinition(key));
    expect(missing).toEqual([]);
  });

  it('has no ds160-prefixed registry keys that ds160-question-sets no longer exports', () => {
    const knownKeys = new Set(DS160_FIELDS.map((q) => q.key));
    const orphans = FIELD_REGISTRY
      .map((f) => f.questionKey)
      .filter((k) => /^M3-(SEC|POC|TC|AC)-/.test(k) && !knownKeys.has(k));
    expect(orphans).toEqual([]);
  });

  it('required flag matches the source definition for every shared key', () => {
    const mismatches = DS160_FIELDS
      .filter((q) => (getFieldDefinition(q.key)?.required ?? false) !== (q.required ?? false))
      .map((q) => q.key);
    expect(mismatches).toEqual([]);
  });
});

// Pages under src/app/apply/ that own their own inline `{ key: 'M3-...', ... }`
// question arrays (module3/* is a separate legacy QA-/QB-/.../QK- system and is
// intentionally excluded, per docs/ONE_ROOM_REDESIGN_PLAN.md).
const SCANNED_PAGES = ['story', 'business', 'investment', 'qualifications', 'family', 'ties'];

function extractKeysFromPage(pageDir: string): string[] {
  const path = join(process.cwd(), 'src', 'app', 'apply', pageDir, 'page.tsx');
  const source = readFileSync(path, 'utf8');
  const matches = source.matchAll(/key:\s*'([A-Za-z0-9_-]+)'/g);
  return Array.from(new Set(Array.from(matches, (m) => m[1])));
}

describe('field-registry vs live apply pages', () => {
  for (const pageDir of SCANNED_PAGES) {
    it(`registers every M3-/CHILD- question key rendered on /apply/${pageDir}`, () => {
      const pageKeys = extractKeysFromPage(pageDir).filter((k) => /^(M3-|CHILD-)/.test(k));
      const missing = pageKeys.filter((k) => !getFieldDefinition(k));
      expect(missing).toEqual([]);
    });
  }
});

describe('field-registry internal consistency', () => {
  it('has no duplicate questionKeys', () => {
    const keys = FIELD_REGISTRY.map((f) => f.questionKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every field has a non-empty label and an absolute moduleHref', () => {
    for (const f of FIELD_REGISTRY) {
      expect(f.clientLabel.length).toBeGreaterThan(0);
      expect(f.moduleHref.startsWith('/')).toBe(true);
    }
  });

  it('every field points at a cardId defined in CARD_DEFINITIONS', () => {
    const orphans = FIELD_REGISTRY.filter((f) => !CARD_DEFINITIONS[f.cardId]);
    expect(orphans).toEqual([]);
  });
});
