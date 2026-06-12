'use server'
import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase auth account from a verified email.
 * Uses service role to bypass email confirmation (email is pre-verified
 * via the verification link flow).
 */
export async function createAccountFromVerifiedEmail({
  email,
  password,
  firstName,
  lastName,
  quizSessionId,
}: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  quizSessionId: string;
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

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
  await supabase
    .from('quiz_sessions')
    .update({ user_id: userId })
    .eq('id', quizSessionId)

  // 4. Sign in the user (create a session)
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
