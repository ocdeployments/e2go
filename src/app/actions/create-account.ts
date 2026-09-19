'use server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { validatePassword } from '@/lib/password-policy'
import { VERIFIED_TOKEN_COOKIE } from '@/lib/verified-token-cookie'

/**
 * Creates a Supabase auth account from a verified email.
 * Uses service role to bypass email confirmation, so the email MUST come from
 * proof the caller holds — never from the request. The proof is the httpOnly
 * cookie set by verifyToken(); the address and quiz session are read from the
 * verification row it points at.
 */
export async function createAccountFromVerifiedEmail({
  password,
  firstName,
  lastName,
}: {
  password: string;
  firstName: string;
  lastName: string;
}) {
  const token = cookies().get(VERIFIED_TOKEN_COOKIE)?.value
  if (!token) {
    return { error: 'Your verification has expired. Please open the link in your email again.' }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: verification } = await supabase
    .from('email_verifications')
    .select('email, quiz_session_id')
    .eq('token', token)
    .eq('used', false)
    .not('verified_at', 'is', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!verification?.email) {
    return { error: 'Your verification has expired. Please open the link in your email again.' }
  }

  const email: string = verification.email
  const quizSessionId: string | null = verification.quiz_session_id ?? null

  const passwordError = validatePassword(password, email)
  if (passwordError) {
    return { error: passwordError }
  }

  // 1. Create auth user with pre-verified email
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // email is already verified via link
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
    },
  })

  if (authError || !authData.user) {
    return { error: authError?.message || 'Failed to create account' }
  }

  const userId = authData.user.id

  // 2. Upsert profile
  await supabase.from('profiles').upsert({
    id: userId,
    first_name: firstName,
    last_name: lastName,
    email: email,
  }, { onConflict: 'id' })

  // 3. Link quiz_session to this user
  if (quizSessionId) {
    await supabase
      .from('quiz_sessions')
      .update({ user_id: userId })
      .eq('id', quizSessionId)
  }

  // Single-use: the link cannot mint another account.
  await supabase
    .from('email_verifications')
    .update({ used: true, used_at: new Date().toISOString() })
    .eq('token', token)
  cookies().delete(VERIFIED_TOKEN_COOKIE)

  // 4. Record Terms of Service acceptance (email-verify path skips signup scroll-to-accept)
  await supabase.from('terms_acceptance').upsert(
    {
      user_id: userId,
      terms_version: '1.0',
      accepted_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,terms_version' }
  )

  // 5. Sign in the user (create a session)
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError) {
    // Account created but sign-in failed — user can log in manually
    return { error: null, userId, signInError: signInError.message }
  }

  return { error: null, userId }
}
