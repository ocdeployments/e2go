import { readFileSync } from 'fs';
import { join } from 'path';
import { DOCUMENT_TYPE_TABS, type DocumentType } from '@/types/generation';

// WS1.1 — DOCUMENT_TYPE_TABS in src/types/generation.ts is the authoritative
// tab assignment. Every prompt template's "## Tab Reference:" header must
// start with that tab, or a template can silently drift out of sync with the
// Binder Index (WS3.2) that's built from the code map. Headers are allowed a
// descriptive suffix (e.g. "Tab F — Property / Financial Assets (F-01)").
//
// Mirrors loadPrompt()'s FILE_ALIASES in generation-engine.ts — source_of_funds
// resolves to the merged b01_* file; gift_letter has no Tab Reference header
// convention in its template and is skipped.
describe('template tab headers match DOCUMENT_TYPE_TABS', () => {
  const promptsDir = join(process.cwd(), 'prompts', 'v1', 'documents');

  const FILE_ALIASES: Partial<Record<DocumentType, string>> = {
    source_of_funds: 'b01_source_and_application_of_funds',
    cover_letter_p2: 'cover_letter',
    source_of_funds_p2: 'b01_source_and_application_of_funds',
    declaration_p2: 'declaration_principal',
    qualifications_p2: 'qualifications',
    nonimmigrant_intent_p2: 'nonimmigrant_intent',
    resume_p2: 'resume_principal',
    financial_assets_portfolio: 'f02_investment_portfolio_summary',
  };
  const SKIP: Partial<Record<DocumentType, true>> = { gift_letter: true };

  for (const docType of Object.keys(DOCUMENT_TYPE_TABS) as DocumentType[]) {
    if (SKIP[docType]) continue;

    // _p2 doc types share the base (Investor 1) template file, which has no
    // reason to know about "(Investor 2)" — that context is injected
    // separately via the p2Block mechanism in generation-engine.ts.
    const expectedTab = DOCUMENT_TYPE_TABS[docType].replace(/\s*\(Investor 2\)$/, '');

    it(`${docType} template header starts with "${expectedTab}"`, () => {
      const fileName = FILE_ALIASES[docType] ?? docType;
      const path = join(promptsDir, `${fileName}.md`);
      const content = readFileSync(path, 'utf8');
      const match = content.match(/^##\s*Tab Reference:\s*(.+)$/m);
      expect(match).not.toBeNull();
      expect(match?.[1].trim().startsWith(expectedTab)).toBe(true);
    });
  }
});
