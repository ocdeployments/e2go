/**
 * CIC-P.3 / WS3.4 — Section contract parser
 *
 * Parses the "Structure" block of each generation prompt template
 * (prompts/v1/documents/*.md) into SectionContract[] at runtime, so
 * DOC_SECTION_CONTRACTS in cic-verifier.ts can never drift from the
 * templates — the templates are the single source of truth, not a
 * hand-maintained copy of them.
 *
 * Two heading conventions are in use across the corpus:
 *  - Dominant (14 templates): **Section <roman> — <Name>[:]** bold heading,
 *    prose/bullets follow until the next such heading or a `---` divider.
 *  - nonimmigrant_intent.md only: a `## DOCUMENT STRUCTURE` block containing
 *    plain (non-bold) `<Label>:` headings, terminated by `---`.
 *
 * resume_principal.md, resume_spouse.md, and gift_letter.md have no
 * machine-parseable Structure convention and are intentionally skipped
 * (same precedent as SKIP in tab-consistency.test.ts).
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { DocumentType } from '@/types/generation';

export interface SectionContract {
  name: string;
  establishes: string;
  mustNotRepeat?: string;
}

const PROMPTS_DIR = join(process.cwd(), 'prompts', 'v1', 'documents');

// Mirrors generation-engine.ts loadPrompt()'s FILE_ALIASES — p2 docs reuse
// their principal counterpart's template file and therefore its contract.
const FILE_ALIASES: Partial<Record<DocumentType, string>> = {
  source_of_funds: 'b01_source_and_application_of_funds',
  cover_letter_p2: 'cover_letter',
  source_of_funds_p2: 'b01_source_and_application_of_funds',
  declaration_p2: 'declaration_principal',
  qualifications_p2: 'qualifications',
  nonimmigrant_intent_p2: 'nonimmigrant_intent',
  resume_p2: 'resume_principal',
};

// Templates with no machine-parseable Structure convention.
const SKIP: Partial<Record<DocumentType, true>> = {
  resume_principal: true,
  resume_spouse: true,
  gift_letter: true,
};

function resolveTemplatePath(documentType: DocumentType): string {
  const fileName = FILE_ALIASES[documentType] ?? documentType;
  return join(PROMPTS_DIR, `${fileName}.md`);
}

function summarize(body: string): string {
  let cleaned = body
    .replace(/```[\s\S]*?```/g, ' ') // drop fenced code/table blocks
    .replace(/\s+/g, ' ')
    .trim();
  // Some sections (e.g. a table-only body) have all their content inside a
  // fenced block — fall back to the raw body so establishes isn't empty.
  if (!cleaned) {
    cleaned = body.replace(/[`|-]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // Take the first sentence-ish chunk as the "establishes" summary —
  // enough for the verifier LLM to judge whether the section is present
  // and on-topic, without inlining the entire authoring guidance.
  const firstSentence = cleaned.match(/^.*?[.!?](?:\s|$)/);
  const snippet = (firstSentence ? firstSentence[0] : cleaned).trim();
  return snippet.length > 220 ? `${snippet.slice(0, 217)}...` : snippet;
}

/**
 * Dominant format: **Section <roman> — <Name>[:]**
 * Captures heading name and the prose until the next heading or `---`.
 */
function parseDominantFormat(content: string): SectionContract[] {
  const headingRe = /^\*\*Section\s+[IVXLCDM]+\s*[-—–]\s*(.+?)\*\*/gm;
  const matches = [...content.matchAll(headingRe)];
  if (matches.length === 0) return [];

  const contracts: SectionContract[] = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const rawName = match[1].replace(/:\s*$/, '').trim();
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[i + 1]?.index ?? content.indexOf('\n---', start);
    const body = content.slice(start, end === -1 ? undefined : end);
    contracts.push({ name: rawName, establishes: summarize(body) });
  }
  return contracts;
}

/**
 * nonimmigrant_intent.md's format: a `## DOCUMENT STRUCTURE` block with
 * plain `<Label>:` headings (not bold, no roman numeral), terminated by `---`.
 */
function parsePlainColonFormat(content: string): SectionContract[] {
  const sectionStart = content.indexOf('## DOCUMENT STRUCTURE');
  if (sectionStart === -1) return [];
  const afterHeading = content.slice(sectionStart + '## DOCUMENT STRUCTURE'.length);
  const boundary = afterHeading.indexOf('\n---');
  const block = boundary === -1 ? afterHeading : afterHeading.slice(0, boundary);

  const headingRe = /^([A-Z][A-Za-z /]+):\s*$/gm;
  const matches = [...block.matchAll(headingRe)];
  if (matches.length === 0) return [];

  const contracts: SectionContract[] = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const name = match[1].trim();
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[i + 1]?.index;
    const body = block.slice(start, end);
    contracts.push({ name, establishes: summarize(body) });
  }
  return contracts;
}

/**
 * Returns the section contract for a document type, parsed live from its
 * template file. Returns undefined for document types with no template
 * (unreachable given DocumentType is exhaustive) or no parseable Structure
 * convention (SKIP list).
 */
export function getSectionContract(documentType: DocumentType): SectionContract[] | undefined {
  if (SKIP[documentType]) return undefined;

  const filePath = resolveTemplatePath(documentType);
  if (!existsSync(filePath)) return undefined;

  const content = readFileSync(filePath, 'utf-8');

  const dominant = parseDominantFormat(content);
  if (dominant.length > 0) return dominant;

  const plainColon = parsePlainColonFormat(content);
  if (plainColon.length > 0) return plainColon;

  return undefined;
}
