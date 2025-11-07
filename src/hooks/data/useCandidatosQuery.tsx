import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Candidato } from "./useCandidatos";

export const candidatosKeys = {
  all: ["candidatos"] as const,
  byVaga: (vagaId: string) => [...candidatosKeys.all, "vaga", vagaId] as const,
};

async function fetchCandidatos(vagaId: string): Promise<Candidato[]> {
  const { data, error } = await supabase
    .from("candidatos")
    .select("id, nome_completo, status, criado_em")
    .eq("vaga_relacionada_id", vagaId)
    .order("criado_em", { ascending: false });

  if (error) throw error;
  return data || [];
}

export function useCandidatosQuery(vagaId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: candidatosKeys.byVaga(vagaId!),
    queryFn: () => fetchCandidatos(vagaId!),
    enabled: !!vagaId,
  });

  // Subscribe to real-time updates
  React.useEffect(() => {
    if (!vagaId) return;

    const channel = supabase
      .channel(`candidatos-vaga-${vagaId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "candidatos",
          filter: `vaga_relacionada_id=eq.${vagaId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: candidatosKeys.byVaga(vagaId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vagaId, queryClient]);

  const candidatos = query.data || [];
  const candidatoContratado = candidatos.find((c) => c.status === "Contratado") || null;

  return {
    candidatos,
    candidatoContratado,
    loading: query.isLoading,
    error: query.error as Error | null,
    reload: query.refetch,
  };
}

// Re-export for easier migration
export { useCandidatosQuery as useCandidatos };
