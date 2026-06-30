import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { WebSocket as WSPolyfill } from 'ws';
if (!globalThis.WebSocket) (globalThis as unknown as Record<string, unknown>).WebSocket = WSPolyfill;
import { buildCaseIntelligence } from '../src/lib/case-intelligence-core';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const accounts = [
  { label: 'A — Canada / solo / clean', email: 'romyjames@gmail.com' },
  { label: 'B — France / married / flagged', email: 'test-france@example.com' },
  { label: 'C — UK / family / premium-clean', email: 'test-uk@example.com' },
];

async function main() {
  for (const { label, email } of accounts) {
    console.log(`\n\n========== ${label} (${email}) ==========`);
    const { data: listData, error: userErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const userRow = listData?.users?.find((u) => u.email === email);
    if (userErr || !userRow) {
      console.log('NO USER ROW FOUND', userErr);
      continue;
    }
    const userId = userRow.id;
    const { data: appRow, error: appErr } = await supabase
      .from('applications')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (appErr || !appRow) {
      console.log('NO APPLICATION FOUND', appErr);
      continue;
    }
    const applicationId = appRow.id;
    console.log('userId:', userId, '| applicationId:', applicationId);

    const result = await buildCaseIntelligence(applicationId, userId);
    console.log('Case Model dataState:', result.model.dataState, '| signals:', JSON.stringify(result.model.signalsPresent));
    console.log('Case Theory status:', result.theory.status, '| dims covered:', result.theory.dimensionsCovered, '| directives:', result.theory.directiveCount);

    const { data: theoryRow } = await supabase
      .from('case_theory')
      .select('narrative, dimension_verdicts, doctrine_citations, directives')
      .eq('application_id', applicationId)
      .maybeSingle();
    if (theoryRow) {
      console.log('\n--- NARRATIVE ---');
      console.log(theoryRow.narrative);
      console.log('\n--- DIMENSION VERDICTS ---');
      console.log(JSON.stringify(theoryRow.dimension_verdicts, null, 2));
      console.log('\n--- DOCTRINE CITATIONS (' + (theoryRow.doctrine_citations as unknown[])?.length + ') ---');
      console.log(JSON.stringify(theoryRow.doctrine_citations, null, 2));
    } else {
      console.log('NO case_theory ROW PERSISTED');
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error('THROWN:', e); process.exit(1); });
