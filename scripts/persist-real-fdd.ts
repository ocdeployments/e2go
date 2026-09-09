import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
config({ path: path.resolve(process.cwd(), '.env.local') });

if (!(globalThis as unknown as { WebSocket?: unknown }).WebSocket) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  (globalThis as unknown as { WebSocket: unknown }).WebSocket = require('ws');
}

import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const service = createClient(url, key);

  const { data: usersData, error: usersErr } = await service.auth.admin.listUsers();
  if (usersErr) throw usersErr;
  const user = usersData.users.find(u => u.email === 'romyjames@gmail.com');
  if (!user) throw new Error('User romyjames@gmail.com not found');
  console.log('Found user:', user.id);

  const fields = JSON.parse(fs.readFileSync('/tmp/fdd-extracted-fields.json', 'utf-8'));
  const scoring = JSON.parse(fs.readFileSync('/tmp/fdd-scoring.json', 'utf-8'));
  const territory = JSON.parse(fs.readFileSync('/tmp/fdd-territory.json', 'utf-8'));
  const report = JSON.parse(fs.readFileSync('/tmp/fdd-report.json', 'utf-8'));

  const filePath = '/Users/owner/E2-go/docs/Assisting Hands Home Care April 20, 2025 FDD.pdf';
  const buffer = fs.readFileSync(filePath);
  const storagePath = `${user.id}/fdd/${Date.now()}_Assisting_Hands_Home_Care_April_20_2025_FDD.pdf`;

  console.log('Uploading original PDF to storage:', storagePath);
  const { error: uploadErr } = await service.storage
    .from('application-documents')
    .upload(storagePath, buffer, { contentType: 'application/pdf' });
  if (uploadErr) throw uploadErr;

  const e2Score = {
    overall: scoring.overall,
    dimensions: {
      eligibility_gates: scoring.eligibility_gates,
      investment_substantiality: scoring.investment_substantiality,
      non_marginality: scoring.non_marginality,
      develop_and_direct: scoring.develop_and_direct,
    },
    timing_assessment: scoring.timing,
    ode_assessment: scoring.ode,
    narrative: report.executive_summary ?? {},
    flags: scoring.flags.map((f: { label: string }) => f.label),
  };

  const territoryRecord = {
    overall_score: territory.overall_score,
    overall_rating: territory.overall_rating,
    customer_density_score: territory.population_score.score,
    economic_strength_score: territory.income_score.score,
    competitive_pressure_score: territory.competition_score.score,
    narrative: territory.narrative,
    _full: territory,
  };

  const insertRow = {
    user_id: user.id,
    application_id: null,
    storage_path: storagePath,
    original_filename: 'Assisting Hands Home Care April 20, 2025 FDD.pdf',
    file_size_bytes: buffer.length,
    transaction_type: 'new_unit',
    target_city: 'Celina',
    target_state: 'TX',
    target_zip: '75009',
    investor_liquid_capital: null,
    investor_net_worth: null,
    extraction_status: 'extracted',
    extraction_progress: 100,
    extracted_fields: fields,
    fdd_stale: scoring.timing?.note ? undefined : undefined,
    page_count: null,
    e2_score: e2Score,
    overall_compatibility: scoring.overall,
    flag_count: scoring.flag_count ?? scoring.flags.length,
    territory_analysis: territoryRecord,
    final_report: report,
  };

  // Drop undefined keys (supabase-js chokes on undefined values in some PostgREST versions)
  Object.keys(insertRow).forEach(k => {
    if ((insertRow as Record<string, unknown>)[k] === undefined) delete (insertRow as Record<string, unknown>)[k];
  });

  console.log('Inserting fdd_analyses row...');
  const { data: inserted, error: insertErr } = await service
    .from('fdd_analyses')
    .insert(insertRow)
    .select('id')
    .single();
  if (insertErr) throw insertErr;

  console.log('DONE. fdd_id =', inserted.id);
  console.log(`View at: /fdd/report/${inserted.id}`);
}

main().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
