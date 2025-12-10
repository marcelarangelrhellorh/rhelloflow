import { useQuery, useQueries } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys, CACHE_TIMES } from "@/lib/queryConfig";
import { handleApiError, redirectToLogin } from "@/lib/errorHandler";

interface DashboardStats {
  vagasAbertas: number;
  candidatosAtivos: number;
  vagasAtencao: number;
  idsVagasAtencao: string[];
  mediaFechamento: number;
  taxaAprovacao: number;
  feedbacksPendentes: number;
  vagasCanceladas: number;
}

async function fetchDashboardOverview(): Promise<DashboardStats> {
  // Try optimized RPC first
  const { data, error: rpcError } = await supabase
    .rpc('get_dashboard_overview_secure')
    .single();

  let baseStats: Partial<DashboardStats>;

  if (rpcError) {
    // Fallback to regular view
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('dashboard_overview')
      .select('*')
      .single();

    if (fallbackError) throw fallbackError;
    baseStats = {
      vagasAbertas: fallbackData.vagas_abertas ?? 0,
      candidatosAtivos: fallbackData.candidatos_ativos ?? 0,
      vagasAtencao: fallbackData.vagas_atencao ?? 0,
      idsVagasAtencao: fallbackData.ids_vagas_atencao ?? [],
      mediaFechamento: fallbackData.media_dias_fechamento ?? 0,
      taxaAprovacao: fallbackData.taxa_aprovacao ?? 0,
      feedbacksPendentes: fallbackData.feedbacks_pendentes ?? 0,
    };
  } else {
    baseStats = {
      vagasAbertas: data?.vagas_abertas ?? 0,
      candidatosAtivos: data?.candidatos_ativos ?? 0,
      vagasAtencao: data?.vagas_atencao ?? 0,
      idsVagasAtencao: data?.ids_vagas_atencao ?? [],
      mediaFechamento: data?.media_dias_fechamento ?? 0,
      taxaAprovacao: data?.taxa_aprovacao ?? 0,
      feedbacksPendentes: data?.feedbacks_pendentes ?? 0,
    };
  }

  // Fetch cancelled jobs count in parallel with base stats
  const { count: canceladasCount } = await supabase
    .from('vagas')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Cancelada')
    .is('deleted_at', null);

  return {
    ...baseStats,
    vagasCanceladas: canceladasCount ?? 0,
  } as DashboardStats;
}

async function fetchUserProfile(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "";

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.full_name ?? "";
}

export function useDashboardData() {
  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.dashboard.overview(),
        queryFn: fetchDashboardOverview,
        staleTime: CACHE_TIMES.DEFAULT.staleTime,
        gcTime: CACHE_TIMES.DEFAULT.gcTime,
      },
      {
        queryKey: queryKeys.dashboard.userProfile(),
        queryFn: fetchUserProfile,
        staleTime: CACHE_TIMES.USER_PROFILE.staleTime,
        gcTime: CACHE_TIMES.USER_PROFILE.gcTime,
      },
    ],
  });

  const [statsQuery, profileQuery] = results;
  const isLoading = statsQuery.isLoading || profileQuery.isLoading;
  const error = statsQuery.error || profileQuery.error;

  return {
    stats: statsQuery.data ?? {
      vagasAbertas: 0,
      candidatosAtivos: 0,
      vagasAtencao: 0,
      idsVagasAtencao: [],
      mediaFechamento: 0,
      taxaAprovacao: 0,
      feedbacksPendentes: 0,
      vagasCanceladas: 0,
    },
    userName: profileQuery.data ?? "",
    isLoading,
    error,
    refetch: () => {
      statsQuery.refetch();
      profileQuery.refetch();
    },
  };
}
