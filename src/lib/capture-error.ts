import * as Sentry from '@sentry/nextjs';

/**
 * Central error capture for API routes — always logs to stdout (visible via
 * preview_logs / server logs in any environment) and reports to Sentry when
 * NEXT_PUBLIC_SENTRY_DSN/SENTRY_DSN is configured (see instrumentation.ts).
 * Without a DSN, Sentry.captureException is a no-op — console.error is the
 * fallback so nothing is silently swallowed either way.
 */
export function captureApiError(err: unknown, context: { route: string; [key: string]: unknown }): void {
  const stage = typeof context.stage === 'string' ? `:${context.stage}` : '';
  console.error(`[${context.route}${stage}]`, err);
  Sentry.captureException(err, { extra: context });
}
