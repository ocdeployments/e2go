import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import RenewalEntryClient from './RenewalEntryClient';

export const dynamic = 'force-dynamic';

export default async function RenewalPage() {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect('/login?next=/renewal');

  const svc = createServiceClient();

  // Check if renewal is purchased
  const { data: payment } = await svc
    .from('payments')
    .select('id, created_at')
    .eq('user_id', user.id)
    .eq('payment_type', 'renewal')
    .eq('status', 'completed')
    .limit(1)
    .maybeSingle();

  // If purchased, check for existing intake and go directly there
  if (payment) {
    const { data: intake } = await svc
      .from('renewal_intakes')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (intake) {
      redirect('/renewal/intake');
    }
    // No intake yet — RenewalEntryClient will create one on mount and redirect
  }

  return <RenewalEntryClient hasPurchased={!!payment} />;
}
