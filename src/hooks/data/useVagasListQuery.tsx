import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CACHE_TIMES, queryKeys } from "@/lib/queryConfig";

export interface VagaListItem {
  id: string;
  titulo: string;
  empresa: string;
  recrutador_id?: string | null;
}

async function fetchVagasList(): Promise<VagaListItem[]> {
  const { data, error } = await supabase
    .from("vagas")
    .select("id, titulo, empresa, recrutador_id")
    .is("deleted_at", null)
    .order("titulo");

  if (error) throw error;
  return data || [];
}

export function useVagasListQuery() {
  const query = useQuery({
    queryKey: queryKeys.vagas.list(),
    queryFn: fetchVagasList,
    staleTime: CACHE_TIMES.DEFAULT.staleTime,
    gcTime: CACHE_TIMES.DEFAULT.gcTime,
  });

  return {
    vagas: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
