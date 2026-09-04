/**
 * Scheduler for the post-quiz follow-up sequence.
 *
 * Deliberately separate from email-scheduler.ts, which serves a different
 * population and cannot be extended to cover this one: it reads `applications`
 * and keys its log on application_id and auth user_id. Someone who took the
 * quiz anonymously has neither, so their follow-ups need their own table
 * (quiz_nurture_log) keyed on quiz_session_id.
 *
 * Safety properties, in the order they matter:
 *
 *   1. Consent, from whichever flow collected it. An anonymous quiz taker
 *      ticks the box on the email gate and the answer lands on the quiz row;
 *      someone already signed in never sees that gate, and answered the same
 *      question during onboarding instead. Both are honoured, and neither is
 *      assumed — see hasConsent below.
 *   2. Suppression. Anyone in email_suppressions is skipped, checked per run
 *      rather than cached, so an unsubscribe landing mid-run is honoured.
 *   3. Idempotency. Every send is recorded in quiz_nurture_log, which carries
 *      a UNIQUE (quiz_session_id, step) index. A cron that fires twice, or a
 *      run that dies halfway, cannot double-send: the log is written first,
 *      and a duplicate-key error means someone else already has this one.
 *   4. Exit. Anyone who has paid stops receiving the sequence — they are a
 *      customer now, and the paid lifecycle mail in email-scheduler.ts takes
 *      over from there.
 *
 * The windows are ranges, not exact days, because a cron running once daily
 * would otherwise miss anyone whose anniversary fell between two runs.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sendNurtureEmail, type NurtureStep } from '@/lib/emails/quiz-nurture';

const DAY = 24 * 60 * 60 * 1000;

interface StepWindow {
  step: NurtureStep;
  /** Inclusive lower bound, in days since completed_at. */
  fromDays: number;
  /** Exclusive upper bound. Wide enough to absorb a missed cron run. */
  toDays: number;
}

/**
 * Windows do not overlap, so a single session can only qualify for one step
 * per run and the sequence cannot compress if a run is skipped.
 */
const WINDOWS: StepWindow[] = [
  { step: 'perspective', fromDays: 3, toDays: 9 },
  { step: 'worth', fromDays: 10, toDays: 29 },
  { step: 'last', fromDays: 30, toDays: 120 },
];

function getSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export interface NurtureRunResult {
  scanned: number;
  sent: number;
  skipped: number;
  failed: number;
  details: Array<{ step: NurtureStep; email: string; status: string }>;
}

/**
 * Run one pass of the sequence. Safe to call more than once in a day.
 */
export async function processQuizNurture(): Promise<NurtureRunResult> {
  const supabase = getSupabase();
  const result: NurtureRunResult = { scanned: 0, sent: 0, skipped: 0, failed: 0, details: [] };

  for (const window of WINDOWS) {
    const newest = new Date(Date.now() - window.fromDays * DAY).toISOString();
    const oldest = new Date(Date.now() - window.toDays * DAY).toISOString();

    /**
     * Signed-in sessions carry casl_consent = FALSE unconditionally: the box
     * that sets it lives on the email gate, which their path never renders.
     * So they are pulled in on user_id and their consent is resolved per row
     * against the profile, rather than being read off a column that could
     * only ever say no.
     */
    const { data: sessions, error } = await supabase
      .from('quiz_sessions')
      .select('id, email, result_json, completed_at, casl_consent, user_id')
      .or('casl_consent.eq.true,user_id.not.is.null')
      .not('email', 'is', null)
      .not('outcome', 'is', null)
      .lte('completed_at', newest)
      .gt('completed_at', oldest);

    if (error) {
      console.error(`[nurture] query failed for step ${window.step}:`, error);
      continue;
    }
    if (!sessions?.length) continue;

    result.scanned += sessions.length;

    for (const session of sessions) {
      const email = (session.email as string).toLowerCase();

      const eligible = await isEligible(supabase, session, email, window.step);
      if (!eligible.ok) {
        result.skipped += 1;
        result.details.push({ step: window.step, email, status: eligible.reason });
        continue;
      }

      /**
       * Claim the send before making it. If two runs overlap, the second
       * insert violates UNIQUE (quiz_session_id, step) and that run backs off
       * rather than sending a second copy. A send that then fails leaves a
       * claimed row and no email — the safe direction to fail in, since the
       * alternative is mailing someone twice.
       */
      const { error: claimError } = await supabase
        .from('quiz_nurture_log')
        .insert([{ quiz_session_id: session.id, email, step: window.step, subject: '' }]);

      if (claimError) {
        result.skipped += 1;
        result.details.push({ step: window.step, email, status: 'already claimed' });
        continue;
      }

      const country =
        (session.result_json as Record<string, unknown> | null)?.country as string | undefined;

      const send = await sendNurtureEmail(email, window.step, {
        email,
        country: country ?? null,
        hasViewedResults: eligible.hasViewedResults,
      });

      if (send.ok) {
        await supabase
          .from('quiz_nurture_log')
          .update({ subject: send.subject })
          .eq('quiz_session_id', session.id)
          .eq('step', window.step);

        result.sent += 1;
        result.details.push({ step: window.step, email, status: 'sent' });
      } else {
        console.error(`[nurture] send failed for ${window.step}:`, send.error);
        result.failed += 1;
        result.details.push({ step: window.step, email, status: `failed: ${send.error}` });
      }
    }
  }

  return result;
}

type Eligibility =
  | { ok: true; hasViewedResults: boolean }
  | { ok: false; reason: string; hasViewedResults: boolean };

/**
 * Every reason not to send, checked in cheapest-first order.
 */
interface ScannedSession {
  id: string;
  casl_consent: boolean | null;
  user_id: string | null;
}

/**
 * Whether this person agreed to hear from us, from whichever flow asked.
 *
 * The profile is read live rather than copied onto the quiz row, so that
 * withdrawing consent in onboarding stops the sequence on the next run instead
 * of leaving a stale yes behind. Only TRUE counts: the column is nullable
 * because "never asked" is a real state, and it is not agreement.
 */
async function hasConsent(
  supabase: SupabaseClient,
  session: ScannedSession,
): Promise<boolean> {
  if (session.casl_consent === true) return true;
  if (!session.user_id) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('casl_marketing_consent')
    .eq('id', session.user_id)
    .maybeSingle();

  return profile?.casl_marketing_consent === true;
}

async function isEligible(
  supabase: SupabaseClient,
  session: ScannedSession,
  email: string,
  step: NurtureStep,
): Promise<Eligibility> {
  const sessionId = session.id;

  if (!(await hasConsent(supabase, session))) {
    return { ok: false, reason: 'no consent', hasViewedResults: false };
  }

  const { data: priorSends } = await supabase
    .from('quiz_nurture_log')
    .select('step')
    .eq('quiz_session_id', sessionId);

  const sentSteps = new Set((priorSends ?? []).map((row) => row.step as string));

  if (sentSteps.has(step)) {
    return { ok: false, reason: 'already sent', hasViewedResults: false };
  }

  /**
   * The closing email says the sequence is ending and that we have written
   * twice already. To someone who received neither of those, that is simply
   * untrue, and the email reads as a cold approach with a strange frame. So
   * it only goes to people the earlier steps actually reached.
   *
   * This matters beyond launch. The windows are wide enough that a session
   * completed before the sequence existed, or one that sat through a long
   * cron outage, lands directly in the day-30 window having received nothing.
   * Dropping them is the right failure: silence rather than a false claim.
   */
  if (step === 'last' && sentSteps.size === 0) {
    return { ok: false, reason: 'no earlier sends to close', hasViewedResults: false };
  }

  const { data: suppressed } = await supabase
    .from('email_suppressions')
    .select('email')
    .eq('email', email)
    .maybeSingle();

  if (suppressed) return { ok: false, reason: 'unsubscribed', hasViewedResults: false };

  /**
   * A paying customer leaves the sequence. Matched on address because the
   * quiz row is anonymous — someone can pay from an account whose auth user
   * was created after the quiz, so the address is the only reliable join.
   */
  const { data: paid } = await supabase
    .from('applications')
    .select('id')
    .eq('email', email)
    .eq('payment_status', 'paid')
    .limit(1)
    .maybeSingle();

  if (paid) return { ok: false, reason: 'customer', hasViewedResults: true };

  /**
   * Whether they ever opened their results link, which changes the day-3
   * opening. Any used token for this session counts, including one issued by
   * a resend.
   */
  const { data: verification } = await supabase
    .from('email_verifications')
    .select('used')
    .eq('quiz_session_id', sessionId)
    .eq('used', true)
    .limit(1)
    .maybeSingle();

  return { ok: true, hasViewedResults: Boolean(verification) };
}
