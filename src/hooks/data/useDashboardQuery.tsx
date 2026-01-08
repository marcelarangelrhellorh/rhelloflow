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

// Helper para garantir número válido (nunca NaN)
const toNumber = (val: unknown, fallback = 0): number => {
  if (val === null || val === undefined) return fallback;
  const num = Number(val);
  return isNaN(num) ? fallback : num;
};

async function fetchDashboardOverview(): Promise<DashboardStats> {
  // Try optimized RPC first (retorna array, não usar .single())
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_dashboard_overview_secure');

  // Extrair primeiro item do array de forma segura
  const data = Array.isArray(rpcData) && rpcData.length > 0 ? rpcData[0] : null;

  let baseStats: Partial<DashboardStats>;

  if (rpcError || !data) {
    // Fallback to regular view
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('dashboard_overview')
      .select('*')
      .maybeSingle();

    if (fallbackError) throw fallbackError;
    baseStats = {
      vagasAbertas: toNumber(fallbackData?.vagas_abertas),
      candidatosAtivos: toNumber(fallbackData?.candidatos_ativos),
      vagasAtencao: toNumber(fallbackData?.vagas_atencao),
      idsVagasAtencao: fallbackData?.ids_vagas_atencao ?? [],
      mediaFechamento: toNumber(fallbackData?.media_dias_fechamento),
      taxaAprovacao: toNumber(fallbackData?.taxa_aprovacao),
      feedbacksPendentes: toNumber(fallbackData?.feedbacks_pendentes),
    };
  } else {
    baseStats = {
      vagasAbertas: toNumber(data.vagas_abertas),
      candidatosAtivos: toNumber(data.candidatos_ativos),
      vagasAtencao: toNumber(data.vagas_atencao),
      idsVagasAtencao: data.ids_vagas_atencao ?? [],
      mediaFechamento: toNumber(data.media_dias_fechamento),
      taxaAprovacao: toNumber(data.taxa_aprovacao),
      feedbacksPendentes: toNumber(data.feedbacks_pendentes),
    };
  }

  // Fetch cancelled jobs count
  const { count: canceladasCount } = await supabase
    .from('vagas')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Cancelada')
    .is('deleted_at', null);

  return {
    ...baseStats,
    vagasCanceladas: toNumber(canceladasCount),
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
