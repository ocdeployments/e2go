'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: '#0a0a0a', color: '#fff', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#C9A84C', fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Something went wrong</p>
          <p style={{ color: '#71717a', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            The error has been reported. Try again or contact support.
          </p>
          <button
            onClick={reset}
            style={{ background: '#C9A84C', color: '#0a0a0a', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
