import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { retrieveDoctrine } from '../src/lib/doctrine-retrieval';

const queries = [
  { label: 'Denial D-07', query: 'denial code D-07 reasons for E-2 visa refusal and how to rebut it' },
  { label: 'Crypto source of funds', query: 'documenting cryptocurrency as a source of funds for E-2 investment' },
  { label: 'Marginality rebuttal', query: 'rebutting a marginality finding for a low-revenue E-2 business' },
];

async function main() {
  for (const { label, query } of queries) {
    console.log(`\n=== ${label} ===`);
    console.log(`Query: "${query}"`);
    const chunks = await retrieveDoctrine(query, { matchCount: 5 });
    if (chunks.length === 0) {
      console.log('NO RESULTS RETURNED');
      continue;
    }
    chunks.forEach((c, i) => {
      console.log(`\n[${i + 1}] ${c.sourceFile} (sim ${c.similarity.toFixed(3)}, dim=${c.dimension ?? 'none'})`);
      console.log(c.content.slice(0, 300).replace(/\n/g, ' ') + (c.content.length > 300 ? '…' : ''));
    });
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
