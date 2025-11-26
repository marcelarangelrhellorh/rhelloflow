import { AppNavbar } from "./AppNavbar";
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";

export function Layout() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { roles, loading: rolesLoading } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('🔐 Layout: Iniciando setup de autenticação');
    
    // Set up auth state listener FIRST
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Layout: Auth state change detectado:', event, session ? 'com sessão' : 'sem sessão');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      console.log('🔐 Layout: Sessão inicial carregada:', session ? 'com sessão' : 'sem sessão');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Redirecionar clientes para /acompanhamento
  useEffect(() => {
    if (!loading && !rolesLoading && user && roles.includes('client')) {
      if (location.pathname !== '/acompanhamento') {
        navigate('/acompanhamento', { replace: true });
      }
    }
  }, [loading, rolesLoading, user, roles, location.pathname, navigate]);

  if (loading || rolesLoading) {
    return <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <div className="min-h-screen w-full">
      <AppNavbar />
      <main className="bg-background-light min-h-screen bg-[z#] bg-[#ffcd00]/[0.03]">
        <Outlet />
      </main>
    </div>;
}