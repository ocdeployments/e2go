/**
 * Guard test for the shared rule book (rule-book gap 1).
 *
 * The universal system prompt used to be copy-pasted into all 21
 * prompts/v1/documents/*.md files and had already drifted (line counts 18–74,
 * a `until it until it` typo in business_plan.md, only 3 files carrying the full
 * 8-principle version). It now lives once in
 * prompts/v1/_universal_system_prompt.md and loadPrompt() prepends it.
 *
 * These tests fail if:
 *  - the shared core loses one of its 8 principle headings, or
 *  - any document file reintroduces a `## UNIVERSAL SYSTEM PROMPT` section, or
 *  - loadPrompt() stops returning the shared core + the per-doc delta.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { loadPrompt } from '../generation-engine';

const REPO_ROOT = process.cwd();
const UNIVERSAL_PATH = join(REPO_ROOT, 'prompts', 'v1', '_universal_system_prompt.md');
const DOCUMENTS_DIR = join(REPO_ROOT, 'prompts', 'v1', 'documents');

const PRINCIPLE_HEADINGS = [
  '1. SPECIFIC OVER GENERIC',
  '2. FACTS ONLY — NO LEGAL CONCLUSIONS',
  '3. ACTIVE VOICE',
  '4. CREATIVE BUT HONEST',
  '5. MATCH THE VOICE PROFILE',
  '6. HUMAN NOT AI',
  '7. CITE THE RECORD',
  '8. LEGAL BOUNDARY — NEVER CROSS THIS LINE',
];

describe('universal system prompt — shared core', () => {
  const core = readFileSync(UNIVERSAL_PATH, 'utf-8');

  it('contains all 8 core principle headings', () => {
    for (const heading of PRINCIPLE_HEADINGS) {
      expect(core).toContain(heading);
    }
  });

  it('carries the principle 8 legal-boundary vocabulary list', () => {
    expect(core).toMatch(/"qualifies", "eligible", "meets the standard"/);
  });

  it('does not carry the drifted business_plan typo', () => {
    expect(core).not.toMatch(/until it until it/i);
  });
});

describe('document prompt files — no duplicated core', () => {
  const docFiles = readdirSync(DOCUMENTS_DIR).filter((f) => f.endsWith('.md'));

  it('finds the full set of document prompts', () => {
    expect(docFiles.length).toBeGreaterThanOrEqual(20);
  });

  it.each(docFiles)('%s does not reintroduce a ## UNIVERSAL SYSTEM PROMPT section', (file) => {
    const body = readFileSync(join(DOCUMENTS_DIR, file), 'utf-8');
    expect(body).not.toMatch(/^##\s*UNIVERSAL SYSTEM PROMPT/m);
  });

  it.each(docFiles)('%s does not carry the "until it until it" typo', (file) => {
    const body = readFileSync(join(DOCUMENTS_DIR, file), 'utf-8');
    expect(body).not.toMatch(/until it until it/i);
  });
});

describe('loadPrompt() — assembles core + per-doc delta', () => {
  it('prepends the shared core to every document type', async () => {
    const prompt = await loadPrompt('cover_letter');
    for (const heading of PRINCIPLE_HEADINGS) {
      expect(prompt).toContain(heading);
    }
    // per-doc body still present
    expect(prompt).toMatch(/officer's roadmap through the package/i);
  });

  it('declaration_spouse gets the shared core AND its first-person / derivative delta', async () => {
    const prompt = await loadPrompt('declaration_spouse');
    expect(prompt).toContain('8. LEGAL BOUNDARY — NEVER CROSS THIS LINE'); // shared core
    expect(prompt).toMatch(/first person/i);
    expect(prompt).toMatch(/derivative/i);
  });

  it('declaration_principal gets the first-person delta', async () => {
    const prompt = await loadPrompt('declaration_principal');
    expect(prompt).toContain('1. SPECIFIC OVER GENERIC');
    expect(prompt).toMatch(/first person/i);
  });

  it('qualifications is framed in the third person', async () => {
    const prompt = await loadPrompt('qualifications');
    expect(prompt).toContain('7. CITE THE RECORD');
    expect(prompt).toMatch(/third person/i);
  });

  it('does not double up the core (defensive strip works)', async () => {
    const prompt = await loadPrompt('business_plan');
    const occurrences = prompt.split('1. SPECIFIC OVER GENERIC').length - 1;
    expect(occurrences).toBe(1);
  });
});
