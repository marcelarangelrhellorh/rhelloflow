import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys, CACHE_TIMES } from "@/lib/queryConfig";

// Preload page chunks
const pageChunks: Record<string, () => Promise<unknown>> = {
  "/": () => import("@/pages/Dashboard"),
  "/vagas": () => import("@/pages/Vagas"),
  "/candidatos": () => import("@/pages/Candidatos"),
  "/gerenciar-empresas": () => import("@/pages/GerenciarEmpresas"),
  "/tarefas": () => import("@/pages/Tarefas"),
  "/relatorios": () => import("@/pages/Relatorios"),
  "/acompanhamento": () => import("@/pages/Acompanhamento"),
};

// Track which routes have been prefetched to avoid duplicate work
const prefetchedRoutes = new Set<string>();

export function useSidebarPrefetch() {
  const queryClient = useQueryClient();
  const debounceRef = useRef<Record<string, NodeJS.Timeout>>({});

  const prefetchDashboard = useCallback(async () => {
    // Prefetch dashboard overview
    queryClient.prefetchQuery({
      queryKey: ["dashboard-overview"],
      queryFn: async () => {
        const { data } = await supabase
          .from("dashboard_overview")
          .select("*")
          .single();
        return data;
      },
      staleTime: CACHE_TIMES.DEFAULT.staleTime,
    });
  }, [queryClient]);

  const prefetchVagas = useCallback(async () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.vagas.list(),
      queryFn: async () => {
        const { data } = await supabase
          .from("vw_vagas_com_stats")
          .select("*")
          .is("deleted_at", null)
          .order("criada_em", { ascending: false })
          .limit(50);
        return data;
      },
      staleTime: CACHE_TIMES.DEFAULT.staleTime,
    });
  }, [queryClient]);

  const prefetchCandidatos = useCallback(async () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.candidatos.list(),
      queryFn: async () => {
        const { data } = await supabase
          .from("candidatos_active")
          .select("*")
          .order("criado_em", { ascending: false })
          .limit(50);
        return data;
      },
      staleTime: CACHE_TIMES.DEFAULT.staleTime,
    });
  }, [queryClient]);

  const prefetchEmpresas = useCallback(async () => {
    queryClient.prefetchQuery({
      queryKey: ["empresas"],
      queryFn: async () => {
        const { data } = await supabase
          .from("empresas")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        return data;
      },
      staleTime: CACHE_TIMES.DEFAULT.staleTime,
    });
  }, [queryClient]);

  const prefetchTarefas = useCallback(async () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.tasks.list(),
      queryFn: async () => {
        const { data } = await supabase
          .from("tasks")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        return data;
      },
      staleTime: CACHE_TIMES.DEFAULT.staleTime,
    });
  }, [queryClient]);

  const prefetchRoute = useCallback((route: string) => {
    // Skip if already prefetched in this session
    if (prefetchedRoutes.has(route)) return;

    // Clear existing debounce for this route
    if (debounceRef.current[route]) {
      clearTimeout(debounceRef.current[route]);
    }

    // Debounce prefetch to avoid excessive calls
    debounceRef.current[route] = setTimeout(() => {
      // Mark as prefetched
      prefetchedRoutes.add(route);

      // Preload the page chunk
      const chunkLoader = pageChunks[route];
      if (chunkLoader) {
        chunkLoader().catch(() => {
          // Ignore chunk load errors
        });
      }

      // Prefetch route-specific data
      switch (route) {
        case "/":
          prefetchDashboard();
          break;
        case "/vagas":
          prefetchVagas();
          break;
        case "/candidatos":
          prefetchCandidatos();
          break;
        case "/gerenciar-empresas":
          prefetchEmpresas();
          break;
        case "/tarefas":
          prefetchTarefas();
          break;
        // Add more routes as needed
      }
    }, 100); // 100ms debounce
  }, [prefetchDashboard, prefetchVagas, prefetchCandidatos, prefetchEmpresas, prefetchTarefas]);

  return { prefetchRoute };
}
