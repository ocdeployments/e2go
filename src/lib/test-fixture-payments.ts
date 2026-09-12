// DR-20's synthetic delivery-matrix fixtures insert `payments` rows directly
// (no real Stripe checkout) so the partnership-gating logic they exist to
// exercise (`isPartnership`, in entitlements.ts/case-profile.ts/generate/start)
// has a real `completed` row to read. Dev and prod share one Supabase project
// (confirmed via `vercel env pull`), so those rows must be excluded from the
// production-facing readers that would otherwise mistake a test run for a
// paying customer: health-watchdog's paid-user check, the admin revenue
// dashboard, and the Stripe reconciliation cron. This filter is applied only
// to those three — never to the actual isPartnership gating logic, which is
// exactly what the fixture payment row exists to exercise.
//
// A generic query-builder wrapper (`.eq(...)` returning the same builder type)
// blows past TypeScript's instantiation-depth limit against Supabase's
// PostgrestFilterBuilder generics (TS2589), so this is a shared constant
// applied inline at each call site instead of a chainable function.
export const TEST_FIXTURE_COLUMN = 'is_test_fixture';
export const TEST_FIXTURE_EXCLUDED_VALUE = false;
