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

  useEffect(() => {
    loadStats();
  }, []);

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
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do sistema de recrutamento</p>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vagas Abertas</CardTitle>
            <Briefcase className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.vagasAbertas}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Vagas ativas no momento
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-info">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Candidatos Ativos</CardTitle>
            <Users className="h-5 w-5 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.candidatosAtivos}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Em processo de seleção
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atenção Necessária</CardTitle>
            <AlertCircle className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.vagasAntigas}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Vagas com mais de 30 dias
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Button onClick={() => navigate("/vagas/nova")} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Nova Vaga
        </Button>
        <Button onClick={() => navigate("/candidatos/novo")} variant="outline" size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Novo Candidato
        </Button>
      </div>
    </div>
  );
}
