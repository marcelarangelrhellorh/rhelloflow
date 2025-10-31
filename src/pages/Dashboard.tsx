import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Users, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    vagasAbertas: 0,
    candidatosAtivos: 0,
    vagasAntigas: 0,
    idsVagasAtencao: [] as string[],
  });
  const [last30Stats, setLast30Stats] = useState<{
    tempoMedio: number;
    taxaAprovacao: number;
    feedbacksPendentes: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setUserName(profile.full_name);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    }
  };

  const loadDashboardOverview = async () => {
    try {
      const { data, error } = await supabase
        .from('dashboard_overview')
        .select('*')
        .single();

      if (error) throw error;

      setStats({
        vagasAbertas: data.vagas_abertas ?? 0,
        candidatosAtivos: data.candidatos_ativos ?? 0,
        vagasAntigas: data.vagas_atencao ?? 0,
        idsVagasAtencao: data.ids_vagas_atencao ?? [],
      });

      setLast30Stats({
        tempoMedio: data.media_dias_fechamento ?? 0,
        taxaAprovacao: data.taxa_aprovacao ?? 0,
        feedbacksPendentes: data.feedbacks_pendentes ?? 0,
      });
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
      throw error;
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await loadUserProfile();
      await loadDashboardOverview();
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAttentionClick = () => {
    const ids = (stats.idsVagasAtencao ?? []).join(',');
    navigate(`/vagas?attention=out_of_sla&ids=${encodeURIComponent(ids)}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/30">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const hasNoData = stats.vagasAbertas === 0 && stats.candidatosAtivos === 0;

  return (
    <div className="min-h-screen bg-secondary/30 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {userName ? `Bem-vinda, ${userName}! ` : ""}
            Visão geral do sistema de recrutamento
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          {/* Vagas Abertas */}
          <Card 
            className="group cursor-pointer border-l-4 border-l-primary bg-card transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
            onClick={() => navigate("/vagas")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">
                Vagas Abertas
              </CardTitle>
              <div className="rounded-full bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-card-foreground">
                {stats.vagasAbertas}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Vagas ativas no momento
              </p>
            </CardContent>
          </Card>

          {/* Candidatos Ativos */}
          <Card 
            className="group cursor-pointer border-l-4 border-l-info bg-card transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
            onClick={() => navigate("/funil-candidatos")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">
                Candidatos Ativos
              </CardTitle>
              <div className="rounded-full bg-info/10 p-2 transition-colors group-hover:bg-info/20">
                <Users className="h-5 w-5 text-info" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-card-foreground">
                {stats.candidatosAtivos}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Em processo de seleção
              </p>
            </CardContent>
          </Card>

          {/* Atenção Necessária */}
          <Card 
            className="group cursor-pointer border-l-4 border-l-warning bg-card transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
            onClick={handleAttentionClick}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">
                Atenção Necessária
              </CardTitle>
              <div className="rounded-full bg-warning/10 p-2 transition-colors group-hover:bg-warning/20">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-card-foreground">
                {stats.vagasAntigas}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Vagas abertas há mais de 30 dias úteis
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Ações rápidas</h2>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button 
              onClick={() => navigate("/vagas/nova")} 
              size="lg"
              className="flex-1 transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
            >
              <Plus className="mr-2 h-5 w-5" />
              Nova Vaga
            </Button>
            <Button 
              onClick={() => navigate("/candidatos/novo")} 
              variant="outline" 
              size="lg"
              className="flex-1 transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
            >
              <Plus className="mr-2 h-5 w-5" />
              Novo Candidato
            </Button>
          </div>
        </div>

        {/* Empty State */}
        {hasNoData && (
          <Card className="border-2 border-dashed border-border bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-primary/10 p-4">
                <Briefcase className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">
                Nenhuma vaga ativa no momento
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Que tal cadastrar uma nova vaga e começar o recrutamento?
              </p>
              <Button 
                onClick={() => navigate("/vagas/nova")}
                size="lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                Nova Vaga
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Performance Summary */}
        {!hasNoData && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Resumo dos últimos 30 dias
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🕓</div>
                    <div>
                      <p className="text-2xl font-bold text-card-foreground">
                        {last30Stats ? `${last30Stats.tempoMedio}d` : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tempo médio de fechamento
                      </p>
                      {last30Stats && last30Stats.tempoMedio > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          (dias corridos)
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🎯</div>
                    <div>
                      <p className="text-2xl font-bold text-card-foreground">
                        {last30Stats ? `${last30Stats.taxaAprovacao.toFixed(1)}%` : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Taxa de aprovação
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="bg-card cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
                onClick={() => navigate("/funil-candidatos")}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">💬</div>
                    <div>
                      <p className="text-2xl font-bold text-card-foreground">
                        {last30Stats ? last30Stats.feedbacksPendentes : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Feedbacks pendentes
                      </p>
                      {last30Stats && last30Stats.feedbacksPendentes > 0 && (
                        <p className="text-xs text-warning mt-1">
                          Requer atenção
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}