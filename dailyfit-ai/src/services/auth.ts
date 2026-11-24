import { demoAuth } from '@/demo/store';
import { DEMO_MODE } from '@/lib/demo';
import { toAppError } from '@/lib/errors';
import { requireSupabase } from '@/lib/supabase';

import { invokeFunction } from './functions';

export async function signIn(email: string, password: string) {
  if (DEMO_MODE) return demoAuth.signIn(email);
  const { error } = await requireSupabase().auth.signInWithPassword({ email, password });
  if (error) throw toAppError(error);
}

/** Returns true when email confirmation is required before first sign-in. */
export async function signUp(email: string, password: string, displayName: string): Promise<{ needsConfirmation: boolean }> {
  if (DEMO_MODE) return demoAuth.signUp(email, displayName);
  const { data, error } = await requireSupabase().auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) throw toAppError(error);
  return { needsConfirmation: !data.session };
}

export async function requestPasswordReset(email: string) {
  if (DEMO_MODE) return;
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email);
  // Don't reveal whether the email exists; only surface rate-limit/network problems.
  if (error) {
    const e = toAppError(error);
    if (e.code === 'RATE_LIMITED' || e.code === 'NETWORK') throw e;
  }
}

export async function signOut() {
  if (DEMO_MODE) return demoAuth.signOut();
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw toAppError(error);
}

export async function deleteAccount() {
  if (DEMO_MODE) return demoAuth.deleteAccount();
  await invokeFunction<{ deleted: boolean }>('delete-account', { confirm: 'DELETE' });
  // Local session is now invalid; clear it.
  await requireSupabase().auth.signOut({ scope: 'local' });
}
