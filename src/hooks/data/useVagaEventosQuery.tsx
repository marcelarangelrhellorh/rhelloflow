import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { VagaEvento } from "./useVagaEventos";

export const vagaEventosKeys = {
  all: ["vaga-eventos"] as const,
  byVaga: (vagaId: string) => [...vagaEventosKeys.all, vagaId] as const,
};

async function fetchVagaEventos(vagaId: string): Promise<VagaEvento[]> {
  const { data, error } = await supabase
    .from("vaga_eventos")
    .select("*")
    .eq("vaga_id", vagaId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data || []) as VagaEvento[];
}

export function useVagaEventosQuery(vagaId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: vagaEventosKeys.byVaga(vagaId!),
    queryFn: () => fetchVagaEventos(vagaId!),
    enabled: !!vagaId,
  });

  // Subscribe to real-time updates - optimistic insert
  React.useEffect(() => {
    if (!vagaId) return;

    const channel = supabase
      .channel(`vaga-eventos-${vagaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vaga_eventos",
          filter: `vaga_id=eq.${vagaId}`,
        },
        (payload) => {
          queryClient.setQueryData<VagaEvento[]>(
            vagaEventosKeys.byVaga(vagaId),
            (old) => [payload.new as VagaEvento, ...(old || [])]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vagaId, queryClient]);

  return {
    eventos: query.data || [],
    loading: query.isLoading,
    error: query.error as Error | null,
    reload: query.refetch,
  };
}

// Re-export for easier migration
export { useVagaEventosQuery as useVagaEventos };
