import React from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { VagaEvento } from "./useVagaEventos";

const EVENTS_PER_PAGE = 20;

export const infiniteEventosKeys = {
  all: ["infinite-vaga-eventos"] as const,
  byVaga: (vagaId: string) => [...infiniteEventosKeys.all, vagaId] as const,
};

interface EventosPage {
  eventos: VagaEvento[];
  nextCursor: number | null;
}

async function fetchEventosPage(
  vagaId: string,
  page: number
): Promise<EventosPage> {
  const from = page * EVENTS_PER_PAGE;
  const to = from + EVENTS_PER_PAGE - 1;

  const { data, error, count } = await supabase
    .from("vaga_eventos")
    .select("*", { count: "exact" })
    .eq("vaga_id", vagaId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const totalFetched = (page + 1) * EVENTS_PER_PAGE;
  const hasMore = count ? totalFetched < count : false;

  return {
    eventos: (data || []) as VagaEvento[],
    nextCursor: hasMore ? page + 1 : null,
  };
}

/**
 * Hook para infinite scroll de eventos da vaga
 * 
 * Uso:
 * ```tsx
 * const {
 *   data,
 *   fetchNextPage,
 *   hasNextPage,
 *   isFetchingNextPage,
 *   isLoading,
 * } = useInfiniteVagaEventos(vagaId);
 * 
 * const allEventos = data?.pages.flatMap(page => page.eventos) || [];
 * 
 * <button
 *   onClick={() => fetchNextPage()}
 *   disabled={!hasNextPage || isFetchingNextPage}
 * >
 *   {isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
 * </button>
 * ```
 */
export function useInfiniteVagaEventos(vagaId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: infiniteEventosKeys.byVaga(vagaId!),
    queryFn: ({ pageParam = 0 }) => fetchEventosPage(vagaId!, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!vagaId,
    initialPageParam: 0,
  });

  // Subscribe to real-time updates - adiciona novo evento na primeira página
  React.useEffect(() => {
    if (!vagaId) return;

    const channel = supabase
      .channel(`infinite-eventos-${vagaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vaga_eventos",
          filter: `vaga_id=eq.${vagaId}`,
        },
        (payload) => {
          // Adiciona novo evento no início da primeira página
          queryClient.setQueryData<{
            pages: EventosPage[];
            pageParams: number[];
          }>(infiniteEventosKeys.byVaga(vagaId), (old) => {
            if (!old) return old;

            return {
              ...old,
              pages: [
                {
                  eventos: [payload.new as VagaEvento, ...old.pages[0].eventos],
                  nextCursor: old.pages[0].nextCursor,
                },
                ...old.pages.slice(1),
              ],
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vagaId, queryClient]);

  return {
    ...query,
    eventos: query.data?.pages.flatMap((page) => page.eventos) || [],
  };
}
