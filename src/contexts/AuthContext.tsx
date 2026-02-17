import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  role: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

// Helper: fetch role with 2s timeout so it never hangs
async function fetchRoleWithTimeout(userId: string): Promise<string | null> {
  try {
    const result = await Promise.race([
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000)),
    ]);
    return (result as any)?.data?.role ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Safety: never stay loading more than 3s
    const timer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 3000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const r = await fetchRoleWithTimeout(u.id);
        if (mounted) setRole(r);
      }
      if (mounted) setLoading(false);
      clearTimeout(timer);
    }).catch(() => {
      if (mounted) setLoading(false);
      clearTimeout(timer);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          const r = await fetchRoleWithTimeout(u.id);
          if (mounted) setRole(r);
        } else {
          setRole(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    // Set user immediately, fetch role in background (don't block!)
    setUser(data.user);
    fetchRoleWithTimeout(data.user.id).then(r => setRole(r));
    return { error: null };
  };

  const signOut = async () => {
    setUser(null);
    setRole(null);
    try { await supabase.auth.signOut(); } catch { }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
