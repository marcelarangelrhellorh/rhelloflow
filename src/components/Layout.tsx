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
  const [isExternalUser, setIsExternalUser] = useState(false);
  const { roles, loading: rolesLoading } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
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
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Verificar se é usuário externo
  useEffect(() => {
    const checkUserType = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("id", user.id)
          .single();
        
        setIsExternalUser(profile?.user_type === 'external');
      }
    };
    
    checkUserType();
  }, [user]);

  // Redirecionar usuários externos para /acompanhamento
  useEffect(() => {
    if (!loading && !rolesLoading && user && isExternalUser) {
      if (location.pathname !== '/acompanhamento') {
        navigate('/acompanhamento', { replace: true });
      }
    }
  }, [loading, rolesLoading, user, isExternalUser, location.pathname, navigate]);

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