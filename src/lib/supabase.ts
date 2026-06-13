import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}
if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// Singleton: one GoTrueClient instance per browser tab.
// Without this, every component that calls createBrowserSupabaseClient()
// spawns a separate GoTrueClient on the same storage key, triggering
// "Multiple GoTrueClient instances detected" and causing hung awaits
// when two clients race to refresh the auth token.
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createBrowserSupabaseClient() {
  if (browserClient) return browserClient;
  browserClient = createBrowserClient(supabaseUrl!, supabaseAnonKey!);
  return browserClient;
}
