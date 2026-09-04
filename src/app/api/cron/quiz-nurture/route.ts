import { NextRequest, NextResponse } from 'next/server';
import { processQuizNurture } from '@/lib/quiz-nurture-scheduler';
import { captureApiError } from '@/lib/capture-error';

/**
 * Daily pass over the post-quiz follow-up sequence.
 *
 * Once a day is the right cadence even though the steps are days apart: the
 * scheduler's windows are ranges, so a run that is skipped is caught by the
 * next one rather than dropping anybody out of the sequence.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processQuizNurture();
    console.log(
      `[cron/quiz-nurture] scanned ${result.scanned}, sent ${result.sent}, skipped ${result.skipped}, failed ${result.failed}`,
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    captureApiError(err, { route: 'cron/quiz-nurture', stage: 'process' });
    return NextResponse.json({ error: 'Nurture run failed' }, { status: 500 });
  }
}
