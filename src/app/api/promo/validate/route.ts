import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { validatePromoCode } from '@/lib/promo-codes';
import { checkRateLimit } from '@/lib/rate-limit';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Read-only pre-check so the UI can confirm a code before the user commits to
// checkout. Does not reserve anything — reservePromoRedemption (called from
// the checkout routes) is the actual one-time-use guarantee, so this route
// re-validating here is just for UX and can't itself be abused to "hold" a code.
export async function POST(request: NextRequest) {
  const supabaseAuth = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'You must be signed in to apply a promo code.' }, { status: 401 });
  }

  // No downstream cost here, but with no other gate a signed-in caller could
  // otherwise script this endpoint to enumerate/guess active promo codes.
  const rateLimit = await checkRateLimit(user.id, 'promo-validate');
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, { status: 429 });
  }

  let code: string;
  let tierId: string;
  try {
    const body = await request.json() as { code?: string; tierId?: string };
    if (!body.code || !body.tierId) {
      return NextResponse.json({ error: 'Missing promo code or tier' }, { status: 400 });
    }
    code = body.code;
    tierId = body.tierId;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: profile } = await supabase.from('profiles').select('email').eq('id', user.id).single();
  const email = profile?.email || user.email || '';

  const result = await validatePromoCode(code, user.id, email, tierId, supabase);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, discountPercent: result.promoCode.discount_percent });
}
