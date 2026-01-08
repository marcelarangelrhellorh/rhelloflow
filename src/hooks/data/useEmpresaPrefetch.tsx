import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { empresaKeys } from "./useEmpresaQuery";
import { CACHE_TIMES } from "@/lib/queryConfig";

async function fetchEmpresa(id: string) {
  const { data, error } = await supabase
    .from("empresas")
    .select("*")
    .eq("id", id)
    .single();
  
  if (error) throw error;
  return data;
}

export function useEmpresaPrefetch() {
  const queryClient = useQueryClient();

  const prefetchEmpresa = (empresaId: string) => {
    queryClient.prefetchQuery({
      queryKey: empresaKeys.detail(empresaId),
      queryFn: () => fetchEmpresa(empresaId),
      staleTime: CACHE_TIMES.DEFAULT.staleTime,
    });
  };

  return { prefetchEmpresa };
}
