import { z } from 'zod';

/**
 * Public client configuration. Only EXPO_PUBLIC_* values are available in the app bundle,
 * and they are visible to anyone — never put secrets here.
 */
const EnvSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url().startsWith('https://', 'Supabase URL must use HTTPS').or(
    z.string().regex(/^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?$/, 'HTTP allowed only for local development'),
  ),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

export type PublicEnv = z.infer<typeof EnvSchema>;

export type EnvResult = { ok: true; env: PublicEnv } | { ok: false; problems: string[] };

export function parsePublicEnv(source: Record<string, string | undefined>): EnvResult {
  const parsed = EnvSchema.safeParse(source);
  if (parsed.success) return { ok: true, env: parsed.data };
  return { ok: false, problems: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
}

// Expo inlines EXPO_PUBLIC_* only when accessed statically like this.
export const envResult = parsePublicEnv({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});
