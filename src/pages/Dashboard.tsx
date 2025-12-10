import { memo, useCallback, Suspense, lazy } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Users, AlertTriangle, MessageSquare, Clock, Target, XCircle, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ErrorState } from "@/components/ui/error-state";
import { useDashboardData } from "@/hooks/data/useDashboardQuery";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load secondary cards
const RejectedCandidatesCard = lazy(() => 
  import("@/components/Dashboard/RejectedCandidatesCard").then(m => ({ default: m.RejectedCandidatesCard }))
);
const SharedJobsCard = lazy(() => 
  import("@/components/Dashboard/SharedJobsCard").then(m => ({ default: m.SharedJobsCard }))
);

// Utility functions
const formatInt = (n: number): string => Math.round(n).toString();
const formatPercent = (n: number): string => `${Math.round(n)}%`;

// Card skeleton for lazy loaded cards
const CardSkeleton = () => (
  <Card className="overflow-hidden border-l-4 border-l-muted">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-14 w-14 rounded-full" />
      </div>
    </CardContent>
  </Card>
);

interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  borderColor: string;
  iconBgColor: string;
  iconColor: string;
  onClick?: () => void;
  ariaLabel?: string;
  tooltip?: string;
  pulse?: boolean;
  disabled?: boolean;
}

const KPICard = memo(function KPICard({
  title,
  value,
  subtitle,
  icon,
  borderColor,
  iconBgColor,
  iconColor,
  onClick,
  ariaLabel,
  tooltip,
  pulse = false,
  disabled = false
}: KPICardProps) {
  const isClickable = onClick && !disabled;
  return (
    <Card 
      className={`
        overflow-hidden border-l-4 ${borderColor}
        ${isClickable ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' : 'cursor-default'}
        transition-all duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
      `} 
      onClick={isClickable ? onClick : undefined} 
      onKeyDown={e => isClickable && e.key === 'Enter' && onClick()} 
      tabIndex={isClickable ? 0 : -1} 
      role={isClickable ? "button" : undefined} 
      aria-label={ariaLabel} 
      title={tooltip}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-muted-foreground font-semibold text-base">{title}</p>
            <p className="text-[42px] font-semibold leading-none text-card-foreground">{value}</p>
            <p className="text-muted-foreground font-medium text-base">{subtitle}</p>
          </div>
          <div className={`
            rounded-full p-4 ${iconBgColor} ${iconColor}
            ${pulse ? 'animate-pulse-glow' : ''}
            ${isClickable ? 'group-hover:scale-110' : ''}
            transition-transform duration-150
          `}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default function Dashboard() {
  const navigate = useNavigate();
  const { stats, userName, isLoading, error, refetch } = useDashboardData();

  // Memoized handlers
  const handleVagasAbertasClick = useCallback(() => navigate('/vagas?status=ativas'), [navigate]);
  const handleCandidatosAtivosClick = useCallback(() => navigate('/candidatos?status=ativos'), [navigate]);
  const handleAtencaoClick = useCallback(() => {
    const ids = stats.idsVagasAtencao.join(',');
    navigate(`/vagas?attention=out_of_sla&ids=${encodeURIComponent(ids)}`);
  }, [navigate, stats.idsVagasAtencao]);
  const handleFeedbacksClick = useCallback(() => navigate('/feedbacks-pendentes'), [navigate]);
  const handleTempoMedioClick = useCallback(() => navigate('/vagas?metric=avg_time_to_close'), [navigate]);
  const handleTaxaAprovacaoClick = useCallback(() => navigate('/relatorios?focus=conversion'), [navigate]);
  const handleVagasCanceladasClick = useCallback(() => navigate('/vagas?status=Cancelada'), [navigate]);
  
  const copyPublicFormLink = useCallback(() => {
    const link = `${window.location.origin}/solicitar-vaga`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado para a área de transferência!");
  }, []);

  // Show skeleton on initial load
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 max-w-[1400px] mx-auto">
          <div className="flex flex-col gap-4 mb-4 sm:mb-6">
            <div>
              <h1 className="text-2xl sm:text-[32px] font-bold text-foreground mb-1">Dashboard</h1>
              <p className="text-sm sm:text-[18px] text-muted-foreground">
                {userName && `Olá, ${userName}! `}Visão geral do sistema de recrutamento
              </p>
            </div>
            
            {/* Filtros - UI apenas por enquanto */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 overflow-x-auto pb-1">
              <Select value="30dias" disabled>
                <SelectTrigger className="w-full sm:w-[180px] min-w-0">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value="todos" disabled>
                <SelectTrigger className="w-full sm:w-[180px] min-w-0">
                  <SelectValue placeholder="Recrutador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os recrutadores</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value="todos" disabled>
                <SelectTrigger className="w-full sm:w-[180px] min-w-0">
                  <SelectValue placeholder="CS" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os CS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-8 max-w-[1400px] mx-auto">
        {/* Error banner */}
        {error && (
          <div className="mb-4 sm:mb-6">
            <ErrorState 
              code="SERVER"
              message="Não foi possível carregar os indicadores."
              onRetry={refetch}
              compact
            />
          </div>
        )}

        {/* Ações Rápidas */}
        <div className="mb-4 sm:mb-6">
          <h2 className="text-sm sm:text-base font-semibold text-foreground mb-2 sm:mb-3">Ações rápidas</h2>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Button onClick={copyPublicFormLink} className="font-bold transition-all duration-150 rounded-xl h-11 px-4 sm:px-6 text-sm sm:text-base">
              <Share2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Formulário de vaga</span>
              <span className="sm:hidden">Nova vaga</span>
            </Button>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid gap-3 sm:gap-6 mb-6 sm:mb-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* 1. Vagas Abertas */}
          <KPICard 
            title="Vagas Abertas" 
            value={formatInt(stats.vagasAbertas)} 
            subtitle="Vagas ativas no momento" 
            icon={<Briefcase className="h-7 w-7" />} 
            borderColor="border-l-primary" 
            iconBgColor="bg-primary/10" 
            iconColor="text-primary" 
            onClick={handleVagasAbertasClick} 
            ariaLabel={`Abrir vagas ativas (${stats.vagasAbertas} vagas)`} 
          />

          {/* 2. Vagas Compartilhadas via Link - Lazy loaded */}
          <Suspense fallback={<CardSkeleton />}>
            <SharedJobsCard />
          </Suspense>

          {/* 3. Vagas Fora do Prazo */}
          <KPICard 
            title="Vagas Fora do Prazo" 
            value={formatInt(stats.vagasAtencao)} 
            subtitle="Vagas com mais de 30 dias úteis" 
            icon={<AlertTriangle className="h-7 w-7" />} 
            borderColor="border-l-warning" 
            iconBgColor="bg-warning/10" 
            iconColor={stats.vagasAtencao > 0 ? "text-warning" : "text-muted-foreground"} 
            onClick={handleAtencaoClick} 
            ariaLabel={`Abrir vagas fora do SLA (${stats.vagasAtencao} vagas)`} 
            tooltip="Tempo acima do SLA de 30 dias úteis" 
            disabled={stats.vagasAtencao === 0} 
          />

          {/* 4. Vagas Canceladas */}
          <KPICard 
            title="Vagas Canceladas" 
            value={formatInt(stats.vagasCanceladas)} 
            subtitle="Total de vagas canceladas" 
            icon={<XCircle className="h-7 w-7" />} 
            borderColor="border-l-destructive" 
            iconBgColor="bg-destructive/10" 
            iconColor="text-destructive" 
            onClick={handleVagasCanceladasClick} 
            ariaLabel={`Ver vagas canceladas (${stats.vagasCanceladas} vagas)`} 
          />

          {/* 5. Tempo médio de fechamento */}
          <KPICard 
            title="Tempo médio de fechamento" 
            value={`${formatInt(stats.mediaFechamento)}d`} 
            subtitle="Média dos últimos 30 dias" 
            icon={<Clock className="h-7 w-7" />} 
            borderColor="border-l-success" 
            iconBgColor="bg-success/10" 
            iconColor="text-success" 
            onClick={handleTempoMedioClick} 
            ariaLabel={`Ver métrica de tempo médio (${stats.mediaFechamento} dias)`} 
          />

          {/* 6. Taxa de aprovação */}
          <KPICard 
            title="Taxa de aprovação" 
            value={formatPercent(stats.taxaAprovacao)} 
            subtitle="Contratações / conclusões" 
            icon={<Target className="h-7 w-7" />} 
            borderColor="border-l-success" 
            iconBgColor="bg-success/10" 
            iconColor="text-success" 
            onClick={handleTaxaAprovacaoClick} 
            ariaLabel={`Ver taxa de conversão (${formatPercent(stats.taxaAprovacao)})`} 
          />

          {/* 7. Candidatos Ativos */}
          <KPICard 
            title="Candidatos Ativos" 
            value={formatInt(stats.candidatosAtivos)} 
            subtitle="Em processo de seleção" 
            icon={<Users className="h-7 w-7" />} 
            borderColor="border-l-info" 
            iconBgColor="bg-info/10" 
            iconColor="text-info" 
            onClick={handleCandidatosAtivosClick} 
            ariaLabel={`Abrir candidatos ativos (${stats.candidatosAtivos} candidatos)`} 
          />

          {/* 8. Candidatos Reprovados sem WhatsApp - Lazy loaded */}
          <Suspense fallback={<CardSkeleton />}>
            <RejectedCandidatesCard />
          </Suspense>

          {/* 9. Feedbacks Pendentes */}
          <KPICard 
            title="Feedbacks Pendentes" 
            value={formatInt(stats.feedbacksPendentes)} 
            subtitle="Aguardando retorno do cliente" 
            icon={<MessageSquare className="h-7 w-7" />} 
            borderColor="border-l-purple" 
            iconBgColor="bg-purple/10" 
            iconColor="text-purple" 
            onClick={handleFeedbacksClick} 
            ariaLabel={`Abrir feedbacks pendentes (${stats.feedbacksPendentes} pendentes)`} 
            pulse={stats.feedbacksPendentes > 0} 
          />
        </div>
      </div>
    </div>
  );
}
