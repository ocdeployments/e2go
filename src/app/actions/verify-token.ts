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

  return {
    valid: true,
    email: data.email,
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
