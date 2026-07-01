/**
 * H2 — Deterministic figure provenance check.
 *
 * After a document is generated, extract every numeric figure from the draft
 * and assert that each one can be traced to an entry in numbers_strategy.
 * Figures that cannot be traced are "orphans" — potential hallucinations.
 *
 * This runs BEFORE the LLM verifier so orphans are injected into the
 * correction brief on the first retry attempt (free, no LLM cost).
 */

export interface OrphanFigure {
  raw: string;        // as it appears in the document
  normalized: number; // parsed numeric value
  context: string;    // up to 80 chars surrounding the figure in the draft
}

export interface ProvenanceResult {
  clean: boolean;
  orphans: OrphanFigure[];
  correctionBrief: string;
}

// ── Extraction ────────────────────────────────────────────────────────────────

// Patterns we care about:
//   $1,234,567 | $1.2M | $500K | $1.5 million | 75% | 12% | 14 jobs | 8 employees
// We do NOT flag bare years (2026), plain counters without units, or ordinals.
const FIGURE_PATTERNS: RegExp[] = [
  // Currency: $1,234 | $1.2M | $500K | $1.5 million
  /\$[\d,]+(?:\.\d+)?(?:\s*(?:million|M|K|thousand|k))?/gi,
  // Percentage: 75% | 14.2%
  /\b\d+(?:\.\d+)?%/g,
  // Headcount: "14 employees" | "8 jobs" | "6 FTE" | "12 positions"
  /\b\d+\s+(?:employees?|jobs?|positions?|FTEs?|workers?|hires?|headcount)/gi,
];

function extractFigures(text: string): Array<{ raw: string; context: string }> {
  const found: Array<{ raw: string; start: number; context: string }> = [];
  const seen = new Set<string>();

  for (const pattern of FIGURE_PATTERNS) {
    let match: RegExpExecArray | null;
    const re = new RegExp(pattern.source, pattern.flags);
    while ((match = re.exec(text)) !== null) {
      const raw = match[0].trim();
      if (seen.has(raw.toLowerCase())) continue;
      seen.add(raw.toLowerCase());

      const start = Math.max(0, match.index - 40);
      const end   = Math.min(text.length, match.index + raw.length + 40);
      found.push({ raw, start, context: text.slice(start, end).replace(/\s+/g, ' ').trim() });
    }
  }

  return found;
}

// ── Normalisation ─────────────────────────────────────────────────────────────

function normalizeValue(raw: string): number {
  // Remove $ , % whitespace; handle K/M/million suffix
  let s = raw.replace(/[$,%\s]/g, '');
  // strip trailing words like "employees"
  s = s.replace(/[a-z].*/i, '').trim();

  let multiplier = 1;
  if (/million$/i.test(raw)) multiplier = 1_000_000;
  else if (/[Mk]$/.test(s)) {
    multiplier = s.endsWith('M') ? 1_000_000 : 1_000;
    s = s.slice(0, -1);
  }

  const n = parseFloat(s.replace(/,/g, ''));
  return isNaN(n) ? NaN : n * multiplier;
}

// ── Matching ──────────────────────────────────────────────────────────────────

// Two figures match if their normalised values are within 1% of each other.
// This handles $250,000 vs $250K, and rounding differences.
function figuresMatch(draftNorm: number, strategyNorm: number): boolean {
  if (isNaN(draftNorm) || isNaN(strategyNorm)) return false;
  if (draftNorm === 0 && strategyNorm === 0) return true;
  const rel = Math.abs(draftNorm - strategyNorm) / Math.max(Math.abs(draftNorm), Math.abs(strategyNorm));
  return rel <= 0.01;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function checkFigureProvenance(
  draftText: string,
  numbersStrategy: Array<{ figure: string; value: string }> | null | undefined,
): ProvenanceResult {
  const strategy = numbersStrategy ?? [];

  // Normalise all approved values upfront
  const approvedValues: number[] = strategy
    .map(n => normalizeValue(n.value))
    .filter(v => !isNaN(v));

  const figures = extractFigures(draftText);
  const orphans: OrphanFigure[] = [];

  for (const { raw, context } of figures) {
    const norm = normalizeValue(raw);
    if (isNaN(norm)) continue; // couldn't parse — skip, let LLM verifier handle

    const approved = approvedValues.some(av => figuresMatch(norm, av));
    if (!approved) {
      orphans.push({ raw, normalized: norm, context });
    }
  }

  if (orphans.length === 0) {
    return { clean: true, orphans: [], correctionBrief: '' };
  }

  const lines = [
    'DETERMINISTIC FIGURE PROVENANCE FAILURE:',
    'The following numbers appear in the document but are NOT present in the',
    'approved numbers_strategy list. Each one must either be removed, or replaced',
    'with the exact figure from the canonical numbers list:',
    '',
    ...orphans.map(o => `  • "${o.raw}" (context: "…${o.context}…")`),
    '',
    'Approved figures:',
    ...(strategy.length > 0
      ? strategy.map(n => `  • ${n.figure}: ${n.value}`)
      : ['  (none — do not introduce any specific numbers)']),
  ];

  return {
    clean: false,
    orphans,
    correctionBrief: lines.join('\n'),
  };
}
