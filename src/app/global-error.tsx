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
      <body style={{ background: '#0a0a0a', color: '#f5f0e8', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: '0 24px' }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontStyle: 'italic', color: '#f5f0e8', fontSize: '24px', marginBottom: '0.75rem' }}>Something went wrong</p>
          <p style={{ color: 'rgba(245,240,232,0.6)', fontSize: '0.875rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            The error has been reported. Try again, or contact support if it keeps happening.
          </p>
          <button
            onClick={reset}
            style={{ background: '#C9A84C', color: '#0a0a0a', border: 'none', borderRadius: 0, padding: '12px 24px', cursor: 'pointer', fontWeight: 500, fontFamily: "'DM Sans', sans-serif", fontSize: '14px', letterSpacing: '0.04em', marginBottom: '0.75rem' }}
          >
            Try again
          </button>
          <div>
            <a
              href="mailto:support@e2go.app"
              style={{ color: 'rgba(201,168,76,0.8)', fontSize: '13px', textDecoration: 'underline' }}
            >
              Contact support
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
