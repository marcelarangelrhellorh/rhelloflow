import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CACHE_TIMES, queryKeys } from "@/lib/queryConfig";
import { useUserRoleQuery } from "./useUserRoleQuery";

async function fetchPendingCount(): Promise<number> {
  const { count, error } = await supabase
    .from("deletion_approvals")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) throw error;
  return count ?? 0;
}

/**
 * Hook para gerenciar aprovações pendentes com cache curto (1 minuto)
 * Mantém real-time subscription para invalidação automática
 */
export function usePendingApprovalsQuery() {
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRoleQuery();

  const { data: pendingCount, isLoading } = useQuery({
    queryKey: queryKeys.pendingApprovals,
    queryFn: fetchPendingCount,
    enabled: isAdmin,
    staleTime: CACHE_TIMES.PENDING.staleTime,  // 1 minuto
    gcTime: CACHE_TIMES.PENDING.gcTime,        // 5 minutos
  });

  // Real-time subscription para invalidar cache quando há mudanças
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel("deletion_approvals_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deletion_approvals",
          filter: "status=eq.pending",
        },
        () => {
          // Invalida o cache para refetch automático
          queryClient.invalidateQueries({ queryKey: queryKeys.pendingApprovals });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  return {
    pendingCount: pendingCount ?? 0,
    loading: isLoading,
  };
}
