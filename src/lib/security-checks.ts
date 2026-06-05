export function runStartupSecurityChecks(): void {
  // Only run security check in Vercel production deployments
  // VERCEL=1 is set in production, not during local dev or build
  if (process.env.VERCEL !== '1') {
    return
  }
  if (process.env.NODE_ENV === 'production') {
    if (process.env.SKIP_PAYMENT_WALL === 'true') {
      throw new Error(
        'SECURITY ERROR: SKIP_PAYMENT_WALL=true is set in production. ' +
        'This grants free access to all paid features. ' +
        'Remove this variable from Vercel environment variables immediately.'
      )
    }
  }
  if (process.env.NODE_ENV !== 'test') {
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ]
    for (const v of requiredVars) {
      if (!process.env[v]) {
        console.warn(`WARNING: Required environment variable ${v} is not set`)
      }
    }
  }
}
