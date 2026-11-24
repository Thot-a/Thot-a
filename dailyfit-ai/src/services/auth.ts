import { toAppError } from '@/lib/errors';
import { requireSupabase } from '@/lib/supabase';

import { invokeFunction } from './functions';

export async function signIn(email: string, password: string) {
  const { error } = await requireSupabase().auth.signInWithPassword({ email, password });
  if (error) throw toAppError(error);
}

/** Returns true when email confirmation is required before first sign-in. */
export async function signUp(email: string, password: string, displayName: string): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await requireSupabase().auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) throw toAppError(error);
  return { needsConfirmation: !data.session };
}

export async function requestPasswordReset(email: string) {
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email);
  // Don't reveal whether the email exists; only surface rate-limit/network problems.
  if (error) {
    const e = toAppError(error);
    if (e.code === 'RATE_LIMITED' || e.code === 'NETWORK') throw e;
  }
}

export async function signOut() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw toAppError(error);
}

export async function deleteAccount() {
  await invokeFunction<{ deleted: boolean }>('delete-account', { confirm: 'DELETE' });
  // Local session is now invalid; clear it.
  await requireSupabase().auth.signOut({ scope: 'local' });
}
