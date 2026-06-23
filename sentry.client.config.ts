import * as Sentry from '@sentry/nextjs';

// Only initialise when DSN is present — local dev without the key is a no-op.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV,

    // Capture 10% of sessions as traces in production; 100% in dev/staging.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Capture replays for 5% of sessions, 100% of error sessions.
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Strip PII query-string values before sending.
    beforeSend(event) {
      if (event.request?.url) {
        try {
          const url = new URL(event.request.url);
          ['token', 'code', 'email', 'password'].forEach((k) => url.searchParams.delete(k));
          event.request.url = url.toString();
        } catch {
          // Malformed URL — leave as-is
        }
      }
      return event;
    },
  });
}
