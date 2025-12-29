import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

type AppRole = "recrutador" | "cs" | "admin" | "client";

interface UserRoleData {
  user: User | null;
  roles: AppRole[];
  isAdmin: boolean;
}

// Query key exportado para uso no Auth.tsx
export const AUTH_USER_ROLES_KEY = ['auth-user-roles'];

// Busca user + roles em uma única query (elimina waterfall)
async function fetchUserAndRoles(): Promise<UserRoleData> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { user: null, roles: [], isAdmin: false };
  }
  
  // Busca roles imediatamente (sem esperar outra query)
  const { data: userRoles, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (error) {
    console.error("Error fetching user roles:", error);
    return { user, roles: [], isAdmin: false };
  }

  const rolesList = (userRoles || []).map(ur => ur.role as AppRole);
  
  return {
    user,
    roles: rolesList,
    isAdmin: rolesList.includes("admin"),
  };
}

export function useUserRoleQuery() {
  const queryClient = useQueryClient();

  // Uma única query para user + roles (elimina requests sequenciais)
  const { data, isLoading, refetch } = useQuery({
    queryKey: AUTH_USER_ROLES_KEY,
    queryFn: fetchUserAndRoles,
    staleTime: 30 * 60 * 1000, // 30 minutos - roles mudam muito raramente
    gcTime: 60 * 60 * 1000,    // 1 hora em cache
  });

  // Invalida cache quando auth muda
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        queryClient.invalidateQueries({ queryKey: AUTH_USER_ROLES_KEY });
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const hasRole = (role: AppRole) => data?.roles.includes(role) ?? false;

  return {
    user: data?.user ?? null,
    roles: data?.roles ?? [],
    isAdmin: data?.isAdmin ?? false,
    loading: isLoading,
    hasRole,
    reload: refetch,
  };
}
