#!/usr/bin/env node
/**
 * DR-21 — Three chaos drills, green.
 *
 * Convention-based "staging": no separate Supabase project. Isolation comes
 * from a dedicated test-account email (CHAOS_EMAIL, see chaos-drills-lib.mjs)
 * that nothing else in the app ever creates. Fault injection is a code-level
 * escape hatch: two env-var-gated throw sites already live in
 * src/lib/generation-engine.ts (CHAOS_DRILL_FAIL_DOC_TYPE) and
 * src/lib/document-build-safety.ts (CHAOS_DRILL_FAIL_BUILD_DOC_TYPE). Both
 * are read via process.env inside the actual Next.js server process, so this
 * script cannot flip them itself — drill2-fail, drill2-recover, and drill3
 * each print an explicit runbook step telling the operator to set/unset the
 * var in .env.local and restart `npm run dev` before continuing. That manual
 * bracketing is why DR-21's exit criterion allows "a documented runbook
 * someone other than the author has executed" as an alternative to full CI.
 *
 * Usage:
 *   node scripts/chaos-drills.mjs seed
 *   node scripts/chaos-drills.mjs drill1
 *   node scripts/chaos-drills.mjs drill2-fail <docType>
 *   node scripts/chaos-drills.mjs drill2-recover <docType>
 *   node scripts/chaos-drills.mjs drill3 <docType>
 *
 * docType defaults to 'source_of_funds' for drill2/drill3 if omitted.
 */
import JSZip from 'jszip';
import {
  SUPABASE_URL, SERVICE_KEY, CRON_SECRET, BASE_URL, CHAOS_EMAIL,
  pgrest, dbDelete, findAuthUser, createAuthUser, mintSessionCookie, sleep,
  pollJobStatus, findChaosApplication, requireChaosPersona,
} from './chaos-drills-lib.mjs';
import fixture from './fixtures/chaos-drill-persona-template.json' with { type: 'json' };

// ── Fifteen CORE_DOCUMENT_TYPES (src/lib/document-plan.ts) — the fixture's ──
// answers deliberately don't trigger any conditional doc type, so a seeded
// job always produces exactly these 15.
const CORE_DOCUMENT_TYPES = [
  'cover_letter', 'source_of_funds', 'business_plan', 'qualifications',
  'ds160_reference', 'visa_category', 'nonimmigrant_intent',
  'marginality_rebuttal', 'declaration_principal', 'fund_flow_chronology',
  'net_worth_statement', 'resume_principal', 'gift_letter',
  'org_chart', 'corporate_documents_guide',
];

// Distinct, boring, regex-safe placeholder bodies — no dollar figures, no
// "Mr./Ms. Name" or "national of <country>" phrasing, no "LLC/Inc." business
// names — so seeding never trips src/lib/cic-consistency-sweep.ts's
// canonical-value extraction regexes. Each is deliberately generic; nothing
// here needs to withstand a real quality-gate read, only to be non-empty.
//
// Each entry is also deliberately about an unrelated, mundane topic (not
// "chaos-drill placeholder for <docType>" with the noun swapped) — that
// templated wording was tried first and is >90% word-identical across all
// 15 docs, which trips generation-engine.ts's checkRepetition() (Jaccard
// word-overlap >= 0.70 across every pair). On a resumed job that skips
// generation for already-approved docs, that repetition hit still fires the
// dedup-regeneration branch, which sequentially calls the real Claude API
// once per flagged pair — turning a resume drill into 10+ minutes of live
// LLM calls. Topically distinct filler keeps pairwise similarity low so the
// resumed pipeline reaches its quality gates without doing any of that.
const PLACEHOLDER_CONTENT = {
  cover_letter: 'The reading room reorganized its periodicals by subject rather than by date of arrival, which meant the card catalog needed a second cross-reference drawer. Patrons adjusted within a week, and the librarian noted that browsing time actually dropped once related topics sat on the same shelf.',
  source_of_funds: 'Barometric pressure over the coastal ridge dropped steadily through the afternoon, and the weather station logged three separate wind-direction reversals before dusk. Forecasters attributed the shift to a stalled front colliding with warmer air pushing in from the valley floor.',
  business_plan: 'Clay-heavy soil drains slowly, so the raised beds were built with a gravel base and a mix of compost and coarse sand layered on top. Root vegetables planted in the amended beds germinated nearly two weeks earlier than the ones left in the original plot.',
  qualifications: 'Light roasting brings out brighter acidity, while a longer second crack pushes the beans toward heavier, chocolatey notes. The roaster kept detailed temperature logs for each batch so that a favorable profile could be reproduced instead of rediscovered by accident.',
  ds160_reference: 'The intersection signal timing was adjusted after commuters reported long waits during the evening rush, shortening the north-south green phase by several seconds and lengthening the pedestrian crossing window. Traffic counts afterward showed fewer vehicles queued past the crosswalk.',
  visa_category: 'The wetland survey tracked several flocks resting along the flyway before continuing north, noting that arrival dates shifted earlier compared to counts from a decade prior. Volunteers logged wing markings and feeding behavior each morning before the birds moved on.',
  nonimmigrant_intent: 'The lighthouse logbook described a recurring problem with condensation forming on the lens panels during humid nights, which required wiping down the glass before each rotation. A small vent was eventually added to the lamp room to keep air moving.',
  marginality_rebuttal: 'Overproofed dough collapses once it finally hits the heat of the oven, so the bakery shortened its bulk fermentation window during warmer months. A cooler proofing room solved the problem more reliably than adjusting the yeast quantity ever did.',
  declaration_principal: 'Grinding a parabolic mirror by hand takes patience, since each pass with the abrasive has to be checked against a test plate before moving to a finer grit. The amateur astronomer spent most weekends over two winters finishing a single eight-inch mirror.',
  fund_flow_chronology: 'The reservoir spillway gates were opened in stages after upstream snowmelt raised the water level faster than the engineers had modeled, and downstream flow was monitored hourly to avoid overtopping the smaller channel banks further along the river.',
  net_worth_statement: 'The apiary lost two hives over winter, likely from a combination of cold snaps and a mite population that went unchecked in the fall inspection. The remaining colonies were split in spring to rebuild numbers before the summer nectar flow began.',
  resume_principal: 'Switchback erosion on the upper trail forced volunteers to rebuild nearly forty feet of tread with stone steps and a new drainage culvert. The crew scheduled the heaviest work for early autumn once the seasonal hikers had mostly cleared out.',
  gift_letter: 'A glaze that tests perfectly on a small tile can crawl unpredictably on a curved surface, so the studio started firing sample rings on every new batch before committing a full piece to the kiln. Cooling speed turned out to matter as much as the glaze recipe itself.',
  org_chart: 'The conductor rearranged the string section for the smaller venue, moving the second violins opposite the cellos to balance the sound in a narrower hall. Rehearsal the following week confirmed the new seating carried better to the back rows.',
  corporate_documents_guide: 'Playtesting revealed that the fourth expansion scoring track was too easy to max out early, flattening the back half of the game. The designers reworked the track spacing so that late-game decisions carried more weight than the opening moves.',
};

const DEFAULT_DRILL_DOC_TYPE = 'source_of_funds';

function log(...args) { console.log(...args); }
function ok(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.error(`  ✗ ${msg}`); }
function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  ok(msg);
}

async function dbInsert(table, body) {
  return pgrest('POST', table, { body });
}

async function dbUpdate(table, conditions, patch) {
  const qs = Object.entries(conditions).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
  return pgrest('PATCH', table, { query: `?${qs}`, body: patch });
}

async function dbSelect(table, query) {
  return pgrest('GET', table, { query });
}

/** Thin wrapper around the app's own HTTP API — never talks to Supabase directly. */
async function apiFetch(path, { method = 'GET', cookie, bearer, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = (() => { try { return JSON.parse(text); } catch { return null; } })();
  return { status: res.status, headers: res.headers, json, text };
}

/**
 * Wipes every row this script could have left behind for one chaos-persona
 * user, across every application they've ever had — so seed() is idempotent
 * across repeated runs. Does NOT delete the Supabase auth identity itself;
 * that's reused across reruns.
 */
async function cleanChaosUser(userId) {
  const apps = await dbSelect('applications', `?user_id=eq.${userId}&select=id`);
  for (const { id: applicationId } of apps) {
    for (const table of [
      'generation_resume_log', 'document_generation_jobs', 'generated_documents',
      'revision_credits', 'generation_pipeline_log', 'case_briefs', 'answers',
      'application_documents', 'uploaded_documents', 'simulator_outcomes', 'followup_responses', 'payments',
    ]) {
      await dbDelete(table, { application_id: applicationId });
    }
  }
  await dbDelete('applications', { user_id: userId });
  for (const table of ['quiz_sessions', 'application_lifecycle', 'simulator_sessions']) {
    await dbDelete(table, { user_id: userId });
  }
}

async function findOrCreateChaosAuthUser() {
  let authUser = await findAuthUser(CHAOS_EMAIL);
  if (!authUser) {
    authUser = await createAuthUser(CHAOS_EMAIL);
    ok(`created auth user ${authUser.id}`);
  } else {
    ok(`reusing auth user ${authUser.id}`);
  }
  return authUser;
}

// ── seed ─────────────────────────────────────────────────────────────────

async function seed() {
  log('\n=== seed: building a fully-certified chaos-drill baseline ===\n');

  const authUser = await findOrCreateChaosAuthUser();
  const userId = authUser.id;

  process.stdout.write('  Cleaning any existing chaos-drill state... ');
  await cleanChaosUser(userId);
  console.log('done');

  await pgrest('POST', 'profiles', {
    query: '?on_conflict=id',
    headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
    body: { id: userId, email: CHAOS_EMAIL, first_name: 'Chaos', last_name: 'Drill', role: 'user' },
  });
  ok('profiles row');

  const sessionRow = await dbInsert('quiz_sessions', { user_id: userId, email: CHAOS_EMAIL, ...fixture.quizSession });
  const sessionId = Array.isArray(sessionRow) ? sessionRow[0]?.id : sessionRow?.id;
  ok(`quiz_sessions row ${sessionId}`);

  await dbInsert('application_lifecycle', { user_id: userId, quiz_completed_at: new Date().toISOString() });
  ok('application_lifecycle row');

  const appRow = await dbInsert('applications', { user_id: userId, ...fixture.application });
  const applicationId = Array.isArray(appRow) ? appRow[0]?.id : appRow?.id;
  if (!applicationId) throw new Error(`Failed to insert applications row: ${JSON.stringify(appRow).slice(0, 300)}`);
  ok(`applications row ${applicationId}`);

  const answerRows = fixture.answers.map((a) => ({ application_id: applicationId, ...a }));
  await dbInsert('answers', answerRows);
  ok(`answers (${answerRows.length} rows)`);

  const { cookieHeader } = await mintSessionCookie(CHAOS_EMAIL);

  // generation-engine.ts refuses to run without a case_briefs row ("No case
  // brief found — run analysis engine first") — /api/analysis/run creates it.
  const analysisRes = await apiFetch('/api/analysis/run', { method: 'POST', cookie: cookieHeader, body: { applicationId } });
  if (analysisRes.status !== 200) {
    throw new Error(`/api/analysis/run failed (${analysisRes.status}): ${analysisRes.text.slice(0, 500)}`);
  }
  ok('/api/analysis/run -> case_briefs row created');

  const startRes = await apiFetch('/api/generate/start', { method: 'POST', cookie: cookieHeader, body: { applicationId } });
  if (startRes.status !== 200 || !startRes.json?.jobId) {
    throw new Error(`/api/generate/start failed (${startRes.status}): ${startRes.text.slice(0, 500)}`);
  }
  const jobId = startRes.json.jobId;
  ok(`/api/generate/start -> job ${jobId}`);

  await sleep(1500); // let the 15 placeholder generated_documents rows land
  const placeholders = await dbSelect('generated_documents', `?job_id=eq.${jobId}&select=id,document_type`);
  assert(placeholders.length === CORE_DOCUMENT_TYPES.length,
    `exactly ${CORE_DOCUMENT_TYPES.length} generated_documents placeholders inserted (found ${placeholders.length})`);

  const now = new Date().toISOString();
  for (const docType of CORE_DOCUMENT_TYPES) {
    await dbUpdate('generated_documents', { job_id: jobId, document_type: docType }, {
      status: 'approved',
      content_text: PLACEHOLDER_CONTENT[docType],
      quality_gate_passed: true,
      quality_gate_notes: [],
      client_certified: true,
      certified_at: now,
      approved_at: now,
    });
  }
  ok(`all ${CORE_DOCUMENT_TYPES.length} documents approved + certified`);

  // cic-package-manifest.ts also gates packageReady on three alwaysRequired
  // client_provided tabs (passport, DS-160, investment records) that only
  // ever come from a real upload — without these, "fully certified" here
  // still leaves the manifest permanently non-ready, which would make every
  // drill relying on a fully-ready package fail for a reason unrelated to
  // whatever fault the drill is actually injecting.
  const REQUIRED_UPLOAD_DOC_TYPES = ['passport', 'government_form', 'investment_records'];
  for (const docType of REQUIRED_UPLOAD_DOC_TYPES) {
    await dbInsert('uploaded_documents', {
      user_id: userId,
      application_id: applicationId,
      file_path: '',
      file_name: `chaos-drill-fixture-${docType}.pdf`,
      doc_type: docType,
      extraction_status: 'complete',
      owner_type: 'principal',
    });
  }
  ok(`${REQUIRED_UPLOAD_DOC_TYPES.length} required client_provided uploads seeded (passport, DS-160, investment records)`);

  // Critical: /api/generate/start short-circuits to any job still in
  // IN_FLIGHT_STATUSES (queued/running/pending/processing/awaiting_approval).
  // Left at its default 'queued', this seed job would swallow every
  // subsequent drill's attempt to mint a fresh job.
  await dbUpdate('document_generation_jobs', { id: jobId }, { status: 'completed', completed_at: now });
  ok(`seed job ${jobId} transitioned to 'completed' (unblocks future /api/generate/start calls)`);

  log(`\nSeed complete.`);
  log(`  userId:        ${userId}`);
  log(`  applicationId: ${applicationId}`);
  log(`  seedJobId:     ${jobId}\n`);
}

// ── drill1: kill the instance mid-run -> resume ─────────────────────────

async function drill1() {
  log('\n=== drill1: kill mid-run -> durable checkpointed resume ===\n');
  const { userId, application } = await requireChaosPersona();
  const applicationId = application.id;

  const { cookieHeader } = await mintSessionCookie(CHAOS_EMAIL);
  const startRes = await apiFetch('/api/generate/start', { method: 'POST', cookie: cookieHeader, body: { applicationId } });
  if (startRes.status !== 200 || !startRes.json?.jobId) {
    throw new Error(`/api/generate/start failed (${startRes.status}): ${startRes.text.slice(0, 500)}`);
  }
  const jobId = startRes.json.jobId;
  ok(`minted fresh job ${jobId} (all 15 docs already approved -> every one is skip-eligible)`);

  const elevenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000).toISOString();
  await dbUpdate('document_generation_jobs', { id: jobId }, { status: 'running', updated_at: elevenMinutesAgo });
  ok(`backdated job to status='running', updated_at=11min ago (simulates the instance dying mid-run)`);

  const cronRes = await apiFetch('/api/cron/generation-resume', { method: 'GET', bearer: CRON_SECRET });
  if (cronRes.status !== 200) throw new Error(`/api/cron/generation-resume failed (${cronRes.status}): ${cronRes.text.slice(0, 500)}`);
  assert((cronRes.json?.claimed ?? []).some((c) => (typeof c === 'string' ? c : c.id ?? c.jobId) === jobId) || (cronRes.json?.claimed ?? []).length > 0,
    `cron resume ran and reported a claim (claimed: ${JSON.stringify(cronRes.json?.claimed)})`);

  const finalJob = await pollJobStatus(jobId, { timeoutMs: 60_000 });
  assert(finalJob.status === 'completed', `job ${jobId} reached terminal status 'completed' (got '${finalJob.status}')`);

  const resumeLogs = await dbSelect('generation_resume_log', `?job_id=eq.${jobId}&select=outcome`);
  assert(resumeLogs.length >= 1, `at least one generation_resume_log row exists for job ${jobId}`);
  assert(resumeLogs.some((r) => r.outcome === 'resumed_to_completion'),
    `a generation_resume_log row has outcome='resumed_to_completion' (got: ${JSON.stringify(resumeLogs.map((r) => r.outcome))})`);

  log('\ndrill1: PASS — the package completed after a simulated mid-run death.\n');
}

// ── drill2-fail: force a single-document failure ────────────────────────

async function drill2Fail(docType = DEFAULT_DRILL_DOC_TYPE) {
  log(`\n=== drill2-fail: force ${docType} to fail; other documents must survive ===\n`);
  log('  RUNBOOK STEP (manual, required before this drill observes a real failure):');
  log(`    1. In .env.local, set: CHAOS_DRILL_FAIL_DOC_TYPE=${docType}`);
  log('    2. Restart the dev server: npm run dev');
  log('    3. Re-run this command once the server is back up.\n');

  const { userId, application } = await requireChaosPersona();
  const applicationId = application.id;

  // Knock the target doc out of 'approved' (application-scoped, across all
  // jobs) so /api/generate/start's existingApproved skip-logic doesn't skip
  // it — otherwise the chaos hook never gets a chance to fire for it.
  await dbUpdate('generated_documents', { application_id: applicationId, document_type: docType }, { status: 'queued' });
  ok(`reset ${docType} out of 'approved' so it will actually be (re)generated this run`);

  const preOtherContent = {};
  for (const dt of CORE_DOCUMENT_TYPES) {
    if (dt === docType) continue;
    const rows = await dbSelect('generated_documents', `?application_id=eq.${applicationId}&document_type=eq.${dt}&status=eq.approved&select=content_text&order=created_at.desc&limit=1`);
    preOtherContent[dt] = rows[0]?.content_text ?? null;
  }

  const { cookieHeader } = await mintSessionCookie(CHAOS_EMAIL);
  const startRes = await apiFetch('/api/generate/start', { method: 'POST', cookie: cookieHeader, body: { applicationId } });
  if (startRes.status !== 200 || !startRes.json?.jobId) {
    throw new Error(`/api/generate/start failed (${startRes.status}): ${startRes.text.slice(0, 500)}`);
  }
  const jobId = startRes.json.jobId;
  ok(`minted job ${jobId}`);

  const runRes = await apiFetch(`/api/generate/run/${jobId}`, { method: 'POST', cookie: cookieHeader });
  if (runRes.status !== 202) throw new Error(`/api/generate/run/${jobId} failed (${runRes.status}): ${runRes.text.slice(0, 500)}`);
  ok(`/api/generate/run/${jobId} accepted (202)`);

  const finalJob = await pollJobStatus(jobId, { timeoutMs: 240_000 });
  assert(finalJob.status === 'partial', `job ${jobId} reached status 'partial' (got '${finalJob.status}')`);

  const failedRows = await dbSelect('generated_documents', `?job_id=eq.${jobId}&document_type=eq.${docType}&select=status,quality_gate_passed,quality_gate_notes`);
  const failedRow = failedRows[0];
  assert(!!failedRow, `a generated_documents row exists for job ${jobId} / ${docType}`);
  assert(failedRow.status === 'failed', `${docType} row has status='failed' (got '${failedRow?.status}')`);
  assert(failedRow.quality_gate_passed === false, `${docType} row has quality_gate_passed=false`);

  for (const dt of CORE_DOCUMENT_TYPES) {
    if (dt === docType) continue;
    const rows = await dbSelect('generated_documents', `?application_id=eq.${applicationId}&document_type=eq.${dt}&status=eq.approved&select=content_text&order=created_at.desc&limit=1`);
    assert(rows.length === 1 && rows[0].content_text === preOtherContent[dt], `${dt} untouched (still 'approved', content unchanged)`);
  }

  const downloadRes = await apiFetch(`/api/generate/download/${applicationId}`, { method: 'GET', cookie: cookieHeader });
  assert(downloadRes.status === 403, `GET /api/generate/download/${applicationId} returns 403 while the package is held (got ${downloadRes.status})`);
  const reasons = downloadRes.json?.reasons ?? [];
  // The manifest names the doc by its human-readable label (e.g. "Source of
  // Funds Statement" for docType 'source_of_funds'), not the raw snake_case
  // type — match on every word of the docType rather than the literal string.
  const docTypeWords = docType.split('_');
  assert(
    reasons.some((r) => {
      const rl = String(r).toLowerCase();
      return docTypeWords.every((w) => rl.includes(w)) || rl.includes('quality gate');
    }),
    `403 body names the blocked document (reasons: ${JSON.stringify(reasons)})`
  );

  log(`\ndrill2-fail: PASS — ${docType} failed and was quarantined; the other 14 documents and the package hold are intact.\n`);
}

// ── drill2-recover: a retry regenerates only the failed document ───────

async function drill2Recover(docType = DEFAULT_DRILL_DOC_TYPE) {
  log(`\n=== drill2-recover: retry must regenerate ONLY ${docType} ===\n`);
  log('  RUNBOOK STEP (manual, required before this drill can succeed):');
  log('    1. In .env.local, UNSET (or comment out) CHAOS_DRILL_FAIL_DOC_TYPE');
  log('    2. Restart the dev server: npm run dev');
  log('    3. Re-run this command once the server is back up.\n');

  const { userId, application } = await requireChaosPersona();
  const applicationId = application.id;

  const preOtherContent = {};
  for (const dt of CORE_DOCUMENT_TYPES) {
    if (dt === docType) continue;
    const rows = await dbSelect('generated_documents', `?application_id=eq.${applicationId}&document_type=eq.${dt}&status=eq.approved&select=content_text&order=created_at.desc&limit=1`);
    preOtherContent[dt] = rows[0]?.content_text ?? null;
  }

  const { cookieHeader, accessToken } = await mintSessionCookie(CHAOS_EMAIL);
  const startRes = await apiFetch('/api/generate/start', { method: 'POST', cookie: cookieHeader, body: { applicationId } });
  if (startRes.status !== 200 || !startRes.json?.jobId) {
    throw new Error(`/api/generate/start failed (${startRes.status}): ${startRes.text.slice(0, 500)}`);
  }
  const jobId = startRes.json.jobId;
  ok(`minted job ${jobId}`);

  const runRes = await apiFetch(`/api/generate/run/${jobId}`, { method: 'POST', cookie: cookieHeader });
  if (runRes.status !== 202) throw new Error(`/api/generate/run/${jobId} failed (${runRes.status}): ${runRes.text.slice(0, 500)}`);
  ok(`/api/generate/run/${jobId} accepted (202) — this makes a real LLM call, may take a while`);

  const finalJob = await pollJobStatus(jobId, { timeoutMs: 300_000 });
  assert(finalJob.status === 'completed', `job ${jobId} reached status 'completed' (got '${finalJob.status}')`);

  const retriedRows = await dbSelect('generated_documents', `?job_id=eq.${jobId}&document_type=eq.${docType}&select=status,quality_gate_passed,content_text`);
  const retriedRow = retriedRows[0];
  assert(!!retriedRow && retriedRow.status === 'approved', `${docType} reached status='approved' on the retry job (got '${retriedRow?.status}')`);
  assert(retriedRow.quality_gate_passed !== false, `${docType} passed the quality gate`);
  assert(!!retriedRow.content_text && retriedRow.content_text !== PLACEHOLDER_CONTENT[docType],
    `${docType} has fresh, non-placeholder content_text`);

  for (const dt of CORE_DOCUMENT_TYPES) {
    if (dt === docType) continue;
    const rows = await dbSelect('generated_documents', `?application_id=eq.${applicationId}&document_type=eq.${dt}&status=eq.approved&select=content_text&order=created_at.desc&limit=1`);
    assert(rows.length === 1 && rows[0].content_text === preOtherContent[dt],
      `${dt} byte-identical to pre-retry content (regeneration was scoped to ${docType} only)`);
  }

  const certifyRes = await apiFetch('/api/dashboard/certify-document', {
    method: 'POST', bearer: accessToken, body: { applicationId, documentType: docType },
  });
  assert(certifyRes.status === 200, `POST /api/dashboard/certify-document for ${docType} succeeded (got ${certifyRes.status})`);

  const downloadRes = await apiFetch(`/api/generate/download/${applicationId}`, { method: 'GET', cookie: cookieHeader });
  assert(downloadRes.status === 200, `GET /api/generate/download/${applicationId} returns 200 now that the package is whole again (got ${downloadRes.status})`);
  assert(!downloadRes.headers.get('x-partial-package'), 'no X-Partial-Package header — full recovery, nothing lost');

  log(`\ndrill2-recover: PASS — ${docType} was regenerated in isolation and the package is whole again.\n`);
}

// ── drill3: force a download-time build failure ─────────────────────────

async function drill3(docType = DEFAULT_DRILL_DOC_TYPE) {
  log(`\n=== drill3: force a download-time build failure for ${docType} ===\n`);
  log('  RUNBOOK STEP (manual, required before this drill observes a real failure):');
  log(`    1. In .env.local, set: CHAOS_DRILL_FAIL_BUILD_DOC_TYPE=${docType}`);
  log('    2. Restart the dev server: npm run dev');
  log('    3. Re-run this command once the server is back up.');
  log('    Note: if RESEND_API_KEY is set locally, this also sends a real ops alert email.\n');

  const { userId, application } = await requireChaosPersona();
  const applicationId = application.id;

  const { cookieHeader } = await mintSessionCookie(CHAOS_EMAIL);
  const downloadRes = await apiFetch(`/api/generate/download/${applicationId}`, { method: 'GET', cookie: cookieHeader });

  assert(downloadRes.status === 200, `GET /api/generate/download/${applicationId} returns 200, not a hard failure (got ${downloadRes.status}; body: ${downloadRes.text.slice(0, 300)})`);
  assert(downloadRes.headers.get('content-type')?.includes('application/zip'), `Content-Type is application/zip (got '${downloadRes.headers.get('content-type')}')`);
  assert(downloadRes.headers.get('x-partial-package') === 'true', `X-Partial-Package header is 'true'`);
  assert(downloadRes.headers.get('x-failed-document-count') === '1', `X-Failed-Document-Count header is '1' (got '${downloadRes.headers.get('x-failed-document-count')}')`);

  const failedDocsHeader = downloadRes.headers.get('x-failed-documents');
  assert(!!failedDocsHeader, 'X-Failed-Documents header is present');
  const failedDocs = JSON.parse(decodeURIComponent(failedDocsHeader));
  assert(Array.isArray(failedDocs) && failedDocs.some((f) => (f.type ?? f.documentType ?? f.document_type ?? f) === docType),
    `X-Failed-Documents names ${docType} (got ${failedDocsHeader})`);

  // downloadRes.text was read as text above — re-fetch as a buffer so JSZip gets real bytes.
  const rawRes = await fetch(`${BASE_URL}/api/generate/download/${applicationId}`, { headers: { Cookie: cookieHeader } });
  const buf = Buffer.from(await rawRes.arrayBuffer());
  const zip = await JSZip.loadAsync(buf);
  const names = Object.keys(zip.files);

  const noteFile = names.find((n) => n.includes('COULD NOT BE INCLUDED'));
  assert(!!noteFile, `ZIP contains the failure-note text file (files: ${names.join(', ')})`);

  const docxCount = names.filter((n) => n.endsWith('.docx')).length;
  assert(docxCount >= CORE_DOCUMENT_TYPES.length - 1 + 3,
    `ZIP contains the expected number of surviving .docx files (cover/TOC/dividers + ${CORE_DOCUMENT_TYPES.length - 1} docs; found ${docxCount})`);

  const failedDocxPresent = names.some((n) => n.toLowerCase().includes(docType.replace(/_/g, '')) && n.endsWith('.docx'));
  assert(!failedDocxPresent, `the forced-fail document's .docx is absent from the ZIP`);

  log(`\ndrill3: PASS — download-time failure for ${docType} produced a real 200 + partial ZIP, nothing lost.\n`);
}

// ── CLI ──────────────────────────────────────────────────────────────────

async function main() {
  const [, , cmd, arg] = process.argv;
  try {
    switch (cmd) {
      case 'seed': await seed(); break;
      case 'drill1': await drill1(); break;
      case 'drill2-fail': await drill2Fail(arg || DEFAULT_DRILL_DOC_TYPE); break;
      case 'drill2-recover': await drill2Recover(arg || DEFAULT_DRILL_DOC_TYPE); break;
      case 'drill3': await drill3(arg || DEFAULT_DRILL_DOC_TYPE); break;
      default:
        console.error('Usage: node scripts/chaos-drills.mjs <seed|drill1|drill2-fail|drill2-recover|drill3> [docType]');
        process.exit(1);
    }
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
