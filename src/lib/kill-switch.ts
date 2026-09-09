import { createServiceClient } from './supabase-service';

let cached: { value: boolean; at: number } | null = null;
const CACHE_TTL_MS = 30_000; // 30 seconds — fast admin response, low DB load

/**
 * Returns true if the admin kill switch is enabled in app_settings.
 * Fails open (returns false) on any DB error so a Supabase blip
 * does not lock all users out of LLM features.
 * Caches the result for 30 s to avoid a DB round-trip on every request.
 */
export async function isKillSwitchEnabled(): Promise<boolean> {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_TTL_MS) {
    return cached.value;
  }

  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from('app_settings')
      .select('value')
      .eq('key', 'kill_switch_enabled')
      .single();

    if (error || !data) {
      cached = { value: false, at: now };
      return false;
    }

    const value = data.value === 'true';
    cached = { value, at: now };
    return value;
  } catch {
    cached = { value: false, at: now };
    return false;
  }
}
