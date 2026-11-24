import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { demoAuth, subscribeDemoAuth } from '@/demo/store';
import { DEMO_MODE } from '@/lib/demo';
import { supabase } from '@/lib/supabase';
import type { UserSummary } from '@/types/models';

interface AuthState {
  user: UserSummary | null;
  /** true until the stored session has been restored from secure storage. */
  initializing: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, initializing: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, initializing: !DEMO_MODE && !!supabase });
  const queryClient = useQueryClient();

  useEffect(() => {
    if (DEMO_MODE) {
      return subscribeDemoAuth(() => {
        const user = demoAuth.currentUser();
        if (!user) queryClient.clear();
        setState({ user, initializing: false });
      });
    }
    if (!supabase) return;
    let mounted = true;
    const toUser = (s: { user: { id: string; email?: string } } | null): UserSummary | null =>
      s ? { id: s.user.id, email: s.user.email ?? null } : null;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setState({ user: toUser(data.session), initializing: false });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') queryClient.clear(); // never leak cached data between accounts
      setState({ user: toUser(session), initializing: false });
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  const value = useMemo(() => state, [state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
