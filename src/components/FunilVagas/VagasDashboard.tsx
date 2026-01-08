import { Briefcase, Clock, AlertTriangle, Users, Flame, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JOB_STAGES } from "@/lib/jobStages";
import { PaceCard } from "./PaceCard";
import { usePaceMetrics } from "@/hooks/usePaceMetrics";
interface Vaga {
  id: string;
  titulo: string;
  empresa: string;
  status: string;
  status_slug: string;
  prioridade: string | null;
  criado_em: string;
  candidatos_count?: number;
}
interface VagasDashboardProps {
  vagas: Vaga[];
  mediaDiasAbertos: number;
  vagasForaPrazo: number;
  totalCandidatosAtivos: number;
}
export function VagasDashboard({
  vagas,
  mediaDiasAbertos,
  vagasForaPrazo,
  totalCandidatosAtivos
}: VagasDashboardProps) {
  // Calcular métricas
  const vagasAbertas = vagas.filter(v => v.status_slug !== "concluida" && v.status_slug !== "cancelada").length;

  // Contagem por prioridade
  const prioridadeAlta = vagas.filter(v => v.prioridade === "Alta").length;
  const prioridadeMedia = vagas.filter(v => v.prioridade === "Média").length;
  const prioridadeBaixa = vagas.filter(v => v.prioridade === "Baixa" || !v.prioridade).length;

  // Contagem por etapa
  const vagasPorEtapa = JOB_STAGES.map(stage => ({
    ...stage,
    count: vagas.filter(v => v.status_slug === stage.slug).length
  })).filter(s => s.count > 0);
  const paceMetrics = usePaceMetrics();
  return <div className="space-y-4">
      {/* Pace de Fechamento */}
      <PaceCard metrics={paceMetrics} />

      {/* Resumo do Pipeline */}
      <Card className="border-gray-300 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Resumo do Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Briefcase className="h-4 w-4" />
              <span className="text-sm font-medium">Abertas</span>
            </div>
            <span className="font-bold text-foreground">{vagasAbertas}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Média dias</span>
            </div>
            <span className="font-bold text-foreground">{mediaDiasAbertos}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="font-medium">Fora prazo</span>
            </div>
            <span className="font-bold text-destructive">{vagasForaPrazo}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="font-medium">Candidatos</span>
            </div>
            <span className="font-bold text-foreground">{totalCandidatosAtivos}</span>
          </div>
        </CardContent>
      </Card>

      {/* Por Prioridade */}
      <Card className="border-gray-300 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            Por Prioridade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground font-medium">Alta</span>
            </div>
            <span className="font-bold text-foreground">{prioridadeAlta}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-muted-foreground font-medium">Média</span>
            </div>
            <span className="font-bold text-foreground">{prioridadeMedia}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground font-medium">Baixa</span>
            </div>
            <span className="font-bold text-foreground">{prioridadeBaixa}</span>
          </div>
        </CardContent>
      </Card>

      {/* Distribuição por Etapa */}
      <Card className="border-gray-300 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-blue-500" />
            Distribuição
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {vagasPorEtapa.length > 0 ? vagasPorEtapa.map(stage => <div key={stage.slug} className="flex items-center justify-between">
                <span title={stage.name} className="text-sm text-muted-foreground truncate max-w-[120px] font-medium">
                  {stage.name}
                </span>
                <span className="font-bold text-foreground">{stage.count}</span>
              </div>) : <p className="text-sm text-muted-foreground text-center py-2">
              Nenhuma vaga no momento
            </p>}
        </CardContent>
      </Card>
    </div>;
}