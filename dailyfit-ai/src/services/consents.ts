import { POLICY_VERSION } from '@shared/constants';

import { demoProfile } from '@/demo/store';
import { DEMO_MODE } from '@/lib/demo';
import { toAppError } from '@/lib/errors';
import { requireSupabase } from '@/lib/supabase';

export type ConsentType = 'privacy_policy' | 'terms' | 'health_data' | 'ai_personalization' | 'analytics' | 'marketing';

export type ConsentState = Partial<Record<ConsentType, { granted: boolean; policyVersion: string }>>;

export async function getConsents(): Promise<ConsentState> {
  if (DEMO_MODE) return demoProfile.getConsents();
  const { data, error } = await requireSupabase().from('current_user_consents').select('consent_type, granted, policy_version');
  if (error) throw toAppError(error);
  const out: ConsentState = {};
  for (const r of data) out[r.consent_type as ConsentType] = { granted: r.granted, policyVersion: r.policy_version };
  return out;
}

/** Appends consent decisions (the table is an append-only audit log). */
export async function recordConsents(decisions: Partial<Record<ConsentType, boolean>>): Promise<void> {
  if (DEMO_MODE) return demoProfile.recordConsents(decisions);
  const rows = Object.entries(decisions).map(([consent_type, granted]) => ({
    consent_type,
    granted,
    policy_version: POLICY_VERSION,
  }));
  if (!rows.length) return;
  const { error } = await requireSupabase().from('user_consents').insert(rows);
  if (error) throw toAppError(error);
}

export function hasRequiredConsents(c: ConsentState): boolean {
  const ok = (t: ConsentType) => c[t]?.granted === true && c[t]?.policyVersion === POLICY_VERSION;
  return ok('privacy_policy') && ok('terms') && ok('health_data');
}
