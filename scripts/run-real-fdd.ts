import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
config({ path: path.resolve(process.cwd(), '.env.local') });

// Node 20 (this script's runtime) lacks a native WebSocket global that
// @supabase/realtime-js expects; Next.js's dev/runtime environment supplies
// one, but a bare tsx script doesn't. Polyfill before any supabase import.
if (!(globalThis as unknown as { WebSocket?: unknown }).WebSocket) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  (globalThis as unknown as { WebSocket: unknown }).WebSocket = require('ws');
}

import { extractFddText, extractFdd } from '../src/lib/fdd-extraction-engine';
import { scoreFdd } from '../src/lib/fdd-scoring-engine';
import { analyseTeritory } from '../src/lib/fdd-territory-engine';
import { generateProfessionalReport } from '../src/lib/fdd-report-engine';
import { buildFddPdf } from '../src/lib/fdd-pdf';
import { buildMarketAnalysisPdf } from '../src/lib/market-analysis-pdf';

async function main() {
  const filePath = '/Users/owner/E2-go/docs/Assisting Hands Home Care April 20, 2025 FDD.pdf';
  const targetState = 'TX';
  const targetCity = 'Celina';
  const targetZip = '75009';

  console.log('Reading FDD PDF:', filePath);
  const buffer = fs.readFileSync(filePath);

  console.log('Extracting PDF text...');
  const { text, pageCount, isScanned } = await extractFddText(buffer);
  console.log(`  pages=${pageCount} isScanned=${isScanned} textLength=${text.length}`);
  if (isScanned) throw new Error('Scanned PDF — no extractable text');

  console.log('Running field extraction (LLM)...');
  const extraction = await extractFdd(text, targetState, (p) => {
    console.log(`  extraction progress: chunk=${p.chunk} pct=${p.pct}`);
  });
  console.log(`  totalFields=${extraction.totalFields} lowConfidence=${extraction.lowConfidenceCount} flagCount=${extraction.flagCount}`);
  fs.writeFileSync('/tmp/fdd-extracted-fields.json', JSON.stringify(extraction.fields, null, 2));

  const staleStatus = extraction.staleness.status !== 'current' ? 'fail' : 'current';
  const registrationStatus = extraction.registration.status ?? 'unknown';

  console.log('Scoring...');
  const scoring = scoreFdd(extraction.fields, staleStatus, registrationStatus, null, undefined);
  console.log(`  overall=${scoring.overall}`);
  fs.writeFileSync('/tmp/fdd-scoring.json', JSON.stringify(scoring, null, 2));

  console.log('Running territory analysis...');
  const territory = await analyseTeritory(targetZip, targetState, extraction.fields);
  console.log(`  overall_score=${territory.overall_score} rating=${territory.overall_rating}`);
  fs.writeFileSync('/tmp/fdd-territory.json', JSON.stringify(territory, null, 2));

  console.log('Generating professional report (LLM narrative)...');
  const report = await generateProfessionalReport(
    extraction.fields,
    scoring,
    scoring.ode,
    targetState,
    targetCity,
    territory
  );
  fs.writeFileSync('/tmp/fdd-report.json', JSON.stringify(report, null, 2));

  console.log('Building FDD PDF...');
  const fddPdfBytes = await buildFddPdf(report);
  fs.writeFileSync('/tmp/FDD-Report-AssistingHands-Celina-TX.pdf', Buffer.from(fddPdfBytes));
  console.log(`  wrote /tmp/FDD-Report-AssistingHands-Celina-TX.pdf (${fddPdfBytes.length} bytes)`);

  console.log('Building Market/Territory Analysis PDF...');
  const marketPdfBytes = await buildMarketAnalysisPdf(territory);
  fs.writeFileSync('/tmp/Market-Analysis-Celina-TX.pdf', Buffer.from(marketPdfBytes));
  console.log(`  wrote /tmp/Market-Analysis-Celina-TX.pdf (${marketPdfBytes.length} bytes)`);

  console.log('DONE');
}

main().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
