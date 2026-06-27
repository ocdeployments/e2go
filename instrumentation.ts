import * as Sentry from '@sentry/nextjs';

export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;
  if (!dsn) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Strip auth tokens and API keys from breadcrumbs before they leave the server.
      beforeSend(event) {
        if (event.request?.headers) {
          const h = event.request.headers as Record<string, string>;
          ['authorization', 'cookie', 'x-api-key'].forEach((k) => delete h[k]);
        }
        return event;
      },
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
  }
}
