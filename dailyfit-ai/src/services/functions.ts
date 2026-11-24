import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';

import type { ApiErrorBody } from '@shared/contracts';

import { AppError, toAppError } from '@/lib/errors';
import { requireSupabase } from '@/lib/supabase';

/** Calls an Edge Function with the user's JWT and maps errors to AppError. */
export async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await requireSupabase().functions.invoke<T>(name, { body });
  if (!error) {
    if (data === null) throw new AppError('UNKNOWN');
    return data;
  }
  if (error instanceof FunctionsFetchError) throw new AppError('NETWORK');
  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response;
    let parsed: ApiErrorBody | null = null;
    try {
      parsed = (await res.json()) as ApiErrorBody;
    } catch {
      // non-JSON error body
    }
    const code = parsed?.error.code;
    if (code === 'QUOTA_EXCEEDED' || code === 'INSUFFICIENT_FOOD_DATA' || code === 'AI_UNAVAILABLE' || code === 'UNAUTHENTICATED') {
      throw new AppError(code);
    }
    if (code === 'VALIDATION') throw new AppError('VALIDATION');
    if (code === 'NOT_FOUND') throw new AppError('NOT_FOUND');
    throw toAppError({ status: res.status });
  }
  throw toAppError(error);
}
