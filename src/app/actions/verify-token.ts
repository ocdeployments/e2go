'use server'
import { createClient } from '@supabase/supabase-js'

export async function verifyToken(token: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('email_verifications')
    .select('*')
    .eq('token', token)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !data) {
    return { valid: false, reason: 'expired_or_invalid' }
  }

  // Mark as verified (user clicked the link)
  await supabase
    .from('email_verifications')
    .update({ verified_at: new Date().toISOString() })
    .eq('token', token)

  // email_verifications has no full_name column; quiz_sessions does. Fetch it
  // here with the service role since anonymous clients have no SELECT policy
  // on quiz_sessions (see comment in src/app/results/page.tsx EmailGate).
  let fullName: string | null = null
  if (data.quiz_session_id) {
    const { data: session } = await supabase
      .from('quiz_sessions')
      .select('full_name')
      .eq('id', data.quiz_session_id)
      .maybeSingle()
    fullName = session?.full_name || null
  }

  return {
    valid: true,
    email: data.email,
    full_name: fullName,
    outcome: data.outcome,
    result_json: data.result_json,
    quiz_session_id: data.quiz_session_id,
    franchise_interest: data.franchise_interest
  }
}

export async function markTokenUsed(token: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await supabase
    .from('email_verifications')
    .update({
      used: true,
      used_at: new Date().toISOString()
    })
    .eq('token', token)
}
