import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { HttpError } from './http.ts';

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

/** Client acting as the caller — RLS applies. */
export function userClient(authHeader: string): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Service-role client — bypasses RLS. Use only for trusted writes (RPCs restricted to service_role). */
export function adminClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Verifies the JWT with Supabase Auth on every request and returns the user id. */
export async function requireUser(req: Request): Promise<{ userId: string; client: SupabaseClient }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new HttpError('UNAUTHENTICATED');
  const client = userClient(authHeader);
  const { data, error } = await client.auth.getUser(authHeader.slice('Bearer '.length));
  if (error || !data.user) throw new HttpError('UNAUTHENTICATED');
  return { userId: data.user.id, client };
}
