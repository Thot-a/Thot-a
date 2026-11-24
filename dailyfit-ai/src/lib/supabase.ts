import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { authStorage } from './secureStorage';
import { DEMO_MODE } from './demo';
import { envResult } from './env';

/** null when env is missing — the root layout shows a configuration screen instead of crashing. */
export const supabase: SupabaseClient | null = !DEMO_MODE && envResult.ok
  ? createClient(envResult.env.EXPO_PUBLIC_SUPABASE_URL, envResult.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        storage: authStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  return supabase;
}

// Refresh tokens only while the app is in the foreground (recommended for React Native).
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
