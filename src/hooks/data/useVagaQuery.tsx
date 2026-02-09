import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Vaga } from "./useVaga";
import type { VagaUpdate } from "@/types/database";

export const vagaKeys = {
  all: ["vagas"] as const,
  detail: (id: string) => [...vagaKeys.all, id] as const,
};

async function fetchVaga(id: string): Promise<Vaga | null> {
  const { data, error } = await supabase
    .from("vagas")
    .select(
      `
      *,
      recrutador:users!vagas_recrutador_id_fkey(id, name),
      cs:users!vagas_cs_id_fkey(id, name)
    `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    recrutador: data.recrutador?.name || null,
    cs_responsavel: data.cs?.name || null,
  } as Vaga;
}

export function useVagaQuery(id: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: vagaKeys.detail(id!),
    queryFn: () => fetchVaga(id!),
    enabled: !!id,
  });

  // Subscribe to real-time updates
  React.useEffect(() => {
    if (!id) return;

    let isMounted = true;
    
    // Use timestamp to guarantee unique channel name
    const channelName = `vaga-${id}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vagas",
          filter: `id=eq.${id}`,
        },
        () => {
          // Only update if still mounted
          if (isMounted) {
            queryClient.invalidateQueries({ queryKey: vagaKeys.detail(id) });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      // Use unsubscribe before removing the channel
      channel.unsubscribe().then(() => {
        supabase.removeChannel(channel);
      });
    };
  }, [id, queryClient]);

  const updateMutation = useMutation({
    mutationFn: async (updates: VagaUpdate) => {
      if (!id) throw new Error("No vaga ID");
      
      const { error } = await supabase
        .from("vagas")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: vagaKeys.detail(id!) });

      // Snapshot previous value
      const previousVaga = queryClient.getQueryData<Vaga>(vagaKeys.detail(id!));

      // Optimistically update
      if (previousVaga) {
        queryClient.setQueryData<Vaga>(vagaKeys.detail(id!), {
          ...previousVaga,
          ...updates,
        });
      }

      return { previousVaga };
    },
    onError: (_err, _updates, context) => {
      // Rollback on error
      if (context?.previousVaga) {
        queryClient.setQueryData(vagaKeys.detail(id!), context.previousVaga);
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: vagaKeys.detail(id!) });
    },
  });

  return {
    vaga: query.data ?? null,
    loading: query.isLoading,
    error: query.error as Error | null,
    reload: query.refetch,
    updateVaga: (updates: VagaUpdate) => updateMutation.mutate(updates),
  };
}

// Re-export for easier migration
export { useVagaQuery as useVaga };
