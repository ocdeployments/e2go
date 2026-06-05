import { createClient } from '@supabase/supabase-js';
import {
  sendClock1Day60,
  sendClock1Day67,
  sendClock1Day74,
  sendClock1Day81,
  type Clock1EmailData
} from './emails/clock1-inactivity';
import {
  sendClock2Immediate,
  sendClock2Day60,
  sendClock2Day83,
  type Clock2EmailData,
  type VisaOutcome
} from './emails/clock2-post-outcome';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================
// CLOCK 1 — INACTIVITY RE-ENGAGEMENT
// ============================================

export interface InactiveApplication {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  last_activity_at: string;
  current_tab?: string;
}

function getDaysInactive(lastActivityAt: string): number {
  const lastActivity = new Date(lastActivityAt);
  const now = new Date();
  const diffMs = now.getTime() - lastActivity.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function getTabDisplayName(tab: string | undefined): string {
  const tabNames: Record<string, string> = {
    'a': 'Tab A — Personal Information',
    'b': 'Tab B — Personal Checklist',
    'c': 'Tab C — Visa Category',
    'd': 'Tab D — Cover Letter',
    'e': 'Tab E — Ownership',
    'f': 'Tab F — Investment Proof',
    'g': 'Tab G — Business Evidence',
    'h': 'Tab H — Source of Funds',
    'i': 'Tab I — Non-Marginality',
    'j': 'Tab J — Qualifications',
    'k': 'Tab K — Business Plan',
    'l': 'Tab L — Family Dependents'
  };
  if (!tab) return 'your application';
  return tabNames[tab] || 'your application';
}

async function hasEmailBeenSentToday(
  applicationId: string,
  emailType: string,
  dayNumber: number
): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data } = await getSupabase()
    .from('email_log')
    .select('id')
    .eq('application_id', applicationId)
    .eq('email_type', emailType)
    .eq('day_number', dayNumber)
    .gte('sent_at', today.toISOString())
    .limit(1);

  return (data?.length ?? 0) > 0;
}

async function logEmailSent(
  applicationId: string,
  userId: string,
  emailType: string,
  subject: string,
  clockType: 'clock1' | 'clock2',
  dayNumber: number
): Promise<void> {
  await getSupabase().from('email_log').insert({
    application_id: applicationId,
    user_id: userId,
    email_type: emailType,
    subject: subject,
    clock_type: clockType,
    day_number: dayNumber
  });
}

export async function checkInactivityAndSendEmails(): Promise<{
  processed: number;
  emailsSent: number;
  errors: string[];
}> {
  const result = {
    processed: 0,
    emailsSent: 0,
    errors: [] as string[]
  };

  // Find applications that are inactive (no activity in 60+ days)
  // AND still in progress (not completed) AND paid
  const { data: applications, error } = await getSupabase()
    .from('applications')
    .select('id, user_id, email, full_name, last_activity_at, current_tab, payment_status, module_3_complete, outcome')
    .eq('payment_status', 'paid')
    .eq('module_3_complete', false)
    .is('outcome', null)
    .lte('last_activity_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    result.errors.push(`Failed to query applications: ${error.message}`);
    return result;
  }

  if (!applications || applications.length === 0) {
    console.log('[EMAIL] No inactive applications found');
    return result;
  }

  for (const app of applications) {
    try {
      const daysInactive = getDaysInactive(app.last_activity_at);
      const emailData: Clock1EmailData = {
        recipient: {
          email: app.email,
          name: app.full_name || undefined
        },
        application: {
          applicationId: app.id,
          currentTab: app.current_tab,
          lastActivityAt: app.last_activity_at
        },
        daysInactive,
        currentTabName: getTabDisplayName(app.current_tab)
      };

      // Day 60 - First re-engagement
      if (daysInactive >= 60 && daysInactive < 67) {
        if (await hasEmailBeenSentToday(app.id, 'clock1_day60', 60)) continue;

        const sent = await sendClock1Day60(emailData);
        if (sent) {
          await logEmailSent(app.id, app.user_id, 'clock1_day60', 'Your e2go application is still waiting for you', 'clock1', 60);
          result.emailsSent++;
        }
      }
      // Day 67 - Second re-engagement
      else if (daysInactive >= 67 && daysInactive < 74) {
        if (await hasEmailBeenSentToday(app.id, 'clock1_day67', 67)) continue;

        const sent = await sendClock1Day67(emailData);
        if (sent) {
          await logEmailSent(app.id, app.user_id, 'clock1_day67', 'One thing has changed since you were last here', 'clock1', 67);
          result.emailsSent++;
        }
      }
      // Day 74 - Warning about deletion
      else if (daysInactive >= 74 && daysInactive < 81) {
        if (await hasEmailBeenSentToday(app.id, 'clock1_day74', 74)) continue;

        const sent = await sendClock1Day74(emailData);
        if (sent) {
          await logEmailSent(app.id, app.user_id, 'clock1_day74', 'Your application data will be deleted in 16 days', 'clock1', 74);
          result.emailsSent++;
        }
      }
      // Day 81 - Final notice
      else if (daysInactive >= 81) {
        if (await hasEmailBeenSentToday(app.id, 'clock1_day81', 81)) continue;

        const sent = await sendClock1Day81(emailData);
        if (sent) {
          await logEmailSent(app.id, app.user_id, 'clock1_day81', 'Final notice — 9 days remaining', 'clock1', 81);
          result.emailsSent++;
        }
      }

      result.processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      result.errors.push(`App ${app.id}: ${msg}`);
    }
  }

  return result;
}

// ============================================
// CLOCK 2 — POST-OUTCOME
// ============================================

export async function sendOutcomeEmails(
  applicationId: string,
  outcome: VisaOutcome
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get application details
    const { data: app, error: appError } = await getSupabase()
      .from('applications')
      .select('id, user_id, email, full_name')
      .eq('id', applicationId)
      .single();

    if (appError || !app) {
      return { success: false, error: appError?.message || 'Application not found' };
    }

    const emailData: Clock2EmailData = {
      recipient: {
        email: app.email,
        name: app.full_name || undefined
      },
      application: {
        applicationId: app.id
      },
      outcome
    };

    // Send immediate email
    const subject = outcome === 'approved'
      ? "Congratulations — your E-2 visa journey is complete"
      : "We're sorry to hear about your outcome";

    const sent = await sendClock2Immediate(emailData);
    if (!sent) {
      return { success: false, error: 'Failed to send immediate outcome email' };
    }

    // Log immediate email
    await logEmailSent(app.id, app.user_id, 'clock2_immediate', subject, 'clock2', 0);

    // Schedule Day 60 and Day 83 emails via database
    // The scheduled function will pick these up
    await getSupabase().from('scheduled_emails').insert({
      application_id: applicationId,
      user_id: app.user_id,
      email_type: 'clock2_day60',
      scheduled_for: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      clock_type: 'clock2',
      day_number: 60
    });

    await getSupabase().from('scheduled_emails').insert({
      application_id: applicationId,
      user_id: app.user_id,
      email_type: 'clock2_day83',
      scheduled_for: new Date(Date.now() + 83 * 24 * 60 * 60 * 1000).toISOString(),
      clock_type: 'clock2',
      day_number: 83
    });

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

export async function processScheduledEmails(): Promise<{
  processed: number;
  emailsSent: number;
  errors: string[];
}> {
  const result = {
    processed: 0,
    emailsSent: 0,
    errors: [] as string[]
  };

  const now = new Date().toISOString();

  // Get due scheduled emails
  const { data: scheduled, error } = await getSupabase()
    .from('scheduled_emails')
    .select('*')
    .lte('scheduled_for', now)
    .eq('sent', false);

  if (error) {
    result.errors.push(`Failed to query scheduled emails: ${error.message}`);
    return result;
  }

  if (!scheduled || scheduled.length === 0) {
    return result;
  }

  for (const email of scheduled) {
    try {
      // Get application details
      const { data: app } = await getSupabase()
        .from('applications')
        .select('id, user_id, email, full_name')
        .eq('id', email.application_id)
        .single();

      if (!app) {
        result.errors.push(`Application not found: ${email.application_id}`);
        continue;
      }

      const emailData: Clock2EmailData = {
        recipient: {
          email: app.email,
          name: app.full_name || undefined
        },
        application: {
          applicationId: app.id
        },
        outcome: 'approved' // Default, not used in day 60/83 emails
      };

      let sent = false;
      let subject = '';

      if (email.email_type === 'clock2_day60') {
        subject = "30 days until your application data is deleted";
        sent = await sendClock2Day60(emailData);
      } else if (email.email_type === 'clock2_day83') {
        subject = "7 days remaining — download your application record";
        sent = await sendClock2Day83(emailData);
      }

      if (sent) {
        await logEmailSent(app.id, app.user_id, email.email_type, subject, 'clock2', email.day_number);

        // Mark as sent
        await getSupabase()
          .from('scheduled_emails')
          .update({ sent: true, sent_at: new Date().toISOString() })
          .eq('id', email.id);

        result.emailsSent++;
      }

      result.processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      result.errors.push(`Scheduled email ${email.id}: ${msg}`);
    }
  }

  return result;
}