import { describe, expect, it } from 'vitest';

import { parsePublicEnv } from '@/lib/env';
import { AppError, toAppError } from '@/lib/errors';
import { bangkokToday, formatThaiDate } from '@/utils/date';

describe('toAppError', () => {
  it('maps auth and postgres codes', () => {
    expect(toAppError({ code: 'invalid_credentials' }).code).toBe('INVALID_CREDENTIALS');
    expect(toAppError({ code: '42501' }).code).toBe('PERMISSION');
    expect(toAppError({ code: '23514' }).code).toBe('VALIDATION');
    expect(toAppError({ status: 429 }).code).toBe('RATE_LIMITED');
    expect(toAppError(new TypeError('Network request failed')).code).toBe('NETWORK');
  });
  it('never exposes raw server messages', () => {
    const e = toAppError({ message: 'duplicate key value violates unique constraint "secret_internal"' });
    expect(e.message).not.toContain('secret_internal');
  });
  it('marks only transient errors retryable', () => {
    expect(new AppError('NETWORK').retryable).toBe(true);
    expect(new AppError('VALIDATION').retryable).toBe(false);
  });
});

describe('dates', () => {
  it('uses Bangkok calendar day', () => {
    expect(bangkokToday(new Date('2026-11-24T18:30:00Z'))).toBe('2026-11-25');
    expect(bangkokToday(new Date('2026-11-24T16:59:00Z'))).toBe('2026-11-24');
  });
  it('formats Thai Buddhist-era dates', () => {
    expect(formatThaiDate('2026-11-24')).toBe('วันอังคารที่ 24 พ.ย. 2569');
  });
});

describe('env', () => {
  it('requires https Supabase URL outside localhost', () => {
    expect(parsePublicEnv({ EXPO_PUBLIC_SUPABASE_URL: 'http://evil.example.com', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'x'.repeat(30) }).ok).toBe(false);
    expect(parsePublicEnv({ EXPO_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'x'.repeat(30) }).ok).toBe(true);
    expect(parsePublicEnv({ EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'x'.repeat(30) }).ok).toBe(true);
    expect(parsePublicEnv({}).ok).toBe(false);
  });
});
