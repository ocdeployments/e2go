import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}
if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// Singleton stored on `window` so it survives Next.js Fast Refresh module
// re-evaluations. A module-level `let` resets to null on every hot reload,
// spawning a new GoTrueClient each time while the old ones remain alive —
// all competing for the same navigator.locks lock and causing hung awaits
// on signInWithPassword / getSession.
const SINGLETON_KEY = '__e2go_supabase__';

export function createBrowserSupabaseClient() {
  if (typeof window === 'undefined') {
    // SSR path: never cache on the server
    return createBrowserClient(supabaseUrl!, supabaseAnonKey!);
  }
  const w = window as typeof window & { [SINGLETON_KEY]?: ReturnType<typeof createBrowserClient> };
  if (!w[SINGLETON_KEY]) {
    w[SINGLETON_KEY] = createBrowserClient(supabaseUrl!, supabaseAnonKey!);
  }
  return w[SINGLETON_KEY]!;
}
