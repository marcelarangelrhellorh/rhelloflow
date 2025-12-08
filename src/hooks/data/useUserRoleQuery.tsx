import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CACHE_TIMES, queryKeys } from "@/lib/queryConfig";

type AppRole = "recrutador" | "cs" | "admin" | "client";

interface UserRoleData {
  roles: AppRole[];
  isAdmin: boolean;
}

async function fetchUserRoles(userId: string): Promise<UserRoleData> {
  const { data: userRoles, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) throw error;

  const rolesList = (userRoles || []).map(ur => ur.role as AppRole);
  return {
    roles: rolesList,
    isAdmin: rolesList.includes("admin"),
  };
}

export function useUserRoleQuery() {
  const queryClient = useQueryClient();

  // Primeiro, pega o usuário atual
  const { data: user } = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: CACHE_TIMES.USER_PROFILE.staleTime,
    gcTime: CACHE_TIMES.USER_PROFILE.gcTime,
  });

  const userId = user?.id;

  // Query de roles com cache de 10 minutos
  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.userRoles(userId || ''),
    queryFn: () => fetchUserRoles(userId!),
    enabled: !!userId,
    staleTime: CACHE_TIMES.USER_PROFILE.staleTime,
    gcTime: CACHE_TIMES.USER_PROFILE.gcTime,
  });

  // Invalida cache quando auth muda
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        queryClient.invalidateQueries({ queryKey: ['auth-user'] });
        if (userId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.userRoles(userId) });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient, userId]);

  const hasRole = (role: AppRole) => data?.roles.includes(role) ?? false;

  return {
    roles: data?.roles ?? [],
    isAdmin: data?.isAdmin ?? false,
    loading: isLoading,
    hasRole,
    reload: refetch,
  };
}
