import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CACHE_TIMES, queryKeys } from "@/lib/queryConfig";
import { useEffect } from "react";

export interface CandidatoListItem {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  nivel: string | null;
  area: string | null;
  status: string;
  recrutador: string | null;
  vaga_relacionada_id: string | null;
  disponibilidade_status?: string | null;
  vaga_titulo?: string | null;
  criado_em: string;
  vaga?: {
    id: string;
    titulo: string | null;
    empresa: string | null;
    recrutador_id: string | null;
  };
}

async function fetchCandidatosList(): Promise<CandidatoListItem[]> {
  const { data, error } = await supabase
    .from("candidatos")
    .select(`
      *,
      vaga:vaga_relacionada_id (
        id,
        titulo,
        empresa,
        recrutador_id
      )
    `)
    .is("deleted_at", null)
    .order("criado_em", { ascending: false });

  if (error) throw error;

  return (data || []).map((candidato: any) => ({
    ...candidato,
    vaga_titulo: candidato.vaga?.titulo || null
  }));
}

export function useCandidatosListQuery() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.candidatos.list(),
    queryFn: fetchCandidatosList,
    staleTime: CACHE_TIMES.OPERATIONAL.staleTime,
    gcTime: CACHE_TIMES.OPERATIONAL.gcTime,
  });

  // Realtime subscription para atualizar lista
  useEffect(() => {
    let isMounted = true;
    const channelName = `candidatos-list-changes-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "candidatos" },
        () => {
          if (isMounted) {
            queryClient.invalidateQueries({ queryKey: queryKeys.candidatos.list() });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      channel.unsubscribe().then(() => {
        supabase.removeChannel(channel);
      });
    };
  }, [queryClient]);

  // Mutation para atualizar status (drag-and-drop)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, additionalData }: { 
      id: string; 
      status: string;
      additionalData?: Record<string, unknown>;
    }) => {
      const updateData = { status, ...additionalData };
      const { error } = await supabase
        .from("candidatos")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(updateData as any)
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.candidatos.list() });
      const previousData = queryClient.getQueryData<CandidatoListItem[]>(queryKeys.candidatos.list());
      
      if (previousData) {
        queryClient.setQueryData<CandidatoListItem[]>(
          queryKeys.candidatos.list(),
          previousData.map(c => c.id === id ? { ...c, status: status as CandidatoListItem['status'] } : c)
        );
      }
      
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.candidatos.list(), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.candidatos.list() });
    },
  });

  return {
    candidatos: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
    updateStatus: updateStatusMutation.mutate,
    updateStatusAsync: updateStatusMutation.mutateAsync,
    isUpdating: updateStatusMutation.isPending,
    invalidate: () => queryClient.invalidateQueries({ queryKey: queryKeys.candidatos.list() }),
  };
}
