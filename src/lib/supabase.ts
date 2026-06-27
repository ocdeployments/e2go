import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}
if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// Bypass navigator.locks entirely. The default GoTrueClient lock serialises
// all auth operations through a single navigator.locks exclusive lock. When
// multiple pages/components trigger concurrent auth calls (getSession, getUser,
// onAuthStateChange) the lock queue can get stuck behind a hung network call,
// blocking the entire app until a page reload. Since we use a singleton client
// and our browser auth is read-mostly (refresh only fires ~37 min before expiry),
// skipping the lock is safe — two concurrent refreshes would just produce the
// same token and the second write overwrites the first without data loss.
function noOpLock<T>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<T>,
): Promise<T> {
  return fn();
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
    w[SINGLETON_KEY] = createBrowserClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { lock: noOpLock },
    });
  }
  return w[SINGLETON_KEY]!;
}
