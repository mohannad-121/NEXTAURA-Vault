import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    setAuthTokenGetter(async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      previousUserId.current = data.session?.user.id ?? null;
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!alive) return;
      const nextUserId = nextSession?.user.id ?? null;
      if (previousUserId.current !== nextUserId) queryClient.clear();
      previousUserId.current = nextUserId;
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
      setAuthTokenGetter(null);
    };
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    session,
    user: session?.user ?? null,
    signOut: async () => {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      queryClient.clear();
    },
  }), [loading, queryClient, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
