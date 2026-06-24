import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'pdfjs-dist', 'pdf-parse'];
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Keystatic admin — looser CSP so the UI works
        source: '/keystatic/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https:; img-src 'self' data: https:; frame-ancestors 'none';",
          },
        ],
      },
      {
        // All other routes — your existing strict CSP
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://openrouter.ai https://api.anthropic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co https://openrouter.ai https://api.anthropic.com; img-src 'self' data: https:; frame-ancestors 'none';",
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps in CI / Vercel — skip in local dev.
  silent: !process.env.CI,

  // Disable source map upload when DSN is absent (local dev without Sentry).
  disableSourceMapUpload: !process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Tunnel Sentry requests through /api/_sentry-tunnel to avoid ad-blockers.
  tunnelRoute: '/api/_sentry-tunnel',

  // Tree-shake Sentry debug code in production builds.
  hideSourceMaps: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});