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
  });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    loadStats();
    loadUserProfile();
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

  const loadStats = async () => {
    try {
      const { data: vagas } = await supabase
        .from("vagas")
        .select("id, criado_em, status")
        .not("status", "in", '("Concluído","Cancelada")');

      const { data: candidatos } = await supabase
        .from("candidatos")
        .select("id")
        .neq("status", "Banco de Talentos");

      const today = new Date();
      const vagasAntigas = vagas?.filter((vaga) => {
        const criadoEm = new Date(vaga.criado_em);
        const diffTime = Math.abs(today.getTime() - criadoEm.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 30;
      }).length || 0;

      setStats({
        vagasAbertas: vagas?.length || 0,
        candidatosAtivos: candidatos?.length || 0,
        vagasAntigas,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setLoading(false);
    }
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
            onClick={() => navigate("/vagas")}
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
                Vagas com mais de 30 dias
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

        {/* Performance Summary (Placeholder) */}
        {!hasNoData && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Resumo dos últimos 30 dias
            </h2>
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🕓</div>
                    <div>
                      <p className="text-2xl font-bold text-card-foreground">—</p>
                      <p className="text-xs text-muted-foreground">
                        Tempo médio de fechamento
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🎯</div>
                    <div>
                      <p className="text-2xl font-bold text-card-foreground">—</p>
                      <p className="text-xs text-muted-foreground">
                        Taxa de aprovação
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">💬</div>
                    <div>
                      <p className="text-2xl font-bold text-card-foreground">—</p>
                      <p className="text-xs text-muted-foreground">
                        Feedbacks pendentes
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🔁</div>
                    <div>
                      <p className="text-2xl font-bold text-card-foreground">—</p>
                      <p className="text-xs text-muted-foreground">
                        Vagas reabertas
                      </p>
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
