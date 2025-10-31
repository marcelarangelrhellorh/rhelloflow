import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Briefcase, Users, AlertTriangle, MessageSquare, Clock, Target, Share2, UserPlus, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// Utility functions
const formatInt = (n: number): string => Math.round(n).toString();
const formatPercent = (n: number): string => `${Math.round(n)}%`;

// Skeleton component
const KPISkeleton = () => (
  <Card className="overflow-hidden">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <div className="h-4 w-24 bg-muted-foreground/20 rounded animate-shimmer" 
               style={{ backgroundImage: "linear-gradient(90deg, transparent, rgba(255,205,0,0.1), transparent)", backgroundSize: "1000px 100%" }} />
          <div className="h-12 w-20 bg-muted-foreground/20 rounded animate-shimmer"
               style={{ backgroundImage: "linear-gradient(90deg, transparent, rgba(255,205,0,0.1), transparent)", backgroundSize: "1000px 100%" }} />
          <div className="h-3 w-32 bg-muted-foreground/20 rounded animate-shimmer"
               style={{ backgroundImage: "linear-gradient(90deg, transparent, rgba(255,205,0,0.1), transparent)", backgroundSize: "1000px 100%" }} />
        </div>
        <div className="h-14 w-14 bg-muted-foreground/20 rounded-full animate-shimmer"
             style={{ backgroundImage: "linear-gradient(90deg, transparent, rgba(255,205,0,0.1), transparent)", backgroundSize: "1000px 100%" }} />
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

const KPICard = ({ 
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
}: KPICardProps) => {
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
      onKeyDown={(e) => isClickable && e.key === 'Enter' && onClick()}
      tabIndex={isClickable ? 0 : -1}
      role={isClickable ? "button" : undefined}
      aria-label={ariaLabel}
      title={tooltip}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-[42px] font-semibold leading-none text-card-foreground">{value}</p>
            <p className="text-[13px] text-muted-foreground">{subtitle}</p>
          </div>
          <div 
            className={`
              rounded-full p-4 ${iconBgColor} ${iconColor}
              ${pulse ? 'animate-pulse-glow' : ''}
              ${isClickable ? 'group-hover:scale-110' : ''}
              transition-transform duration-150
            `}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    vagasAbertas: 0,
    candidatosAtivos: 0,
    vagasAtencao: 0,
    idsVagasAtencao: [] as string[],
    mediaFechamento: 0,
    taxaAprovacao: 0,
    feedbacksPendentes: 0,
    vagasCanceladas: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [periodFilter] = useState("30dias"); // Fixo por enquanto
  const [recrutadorFilter] = useState("todos"); // UI apenas
  const [csFilter] = useState("todos"); // UI apenas

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
      const { data, error: queryError } = await supabase
        .from('dashboard_overview')
        .select('*')
        .single();

      if (queryError) throw queryError;

      // Buscar vagas canceladas separadamente
      const { count: canceladasCount } = await supabase
        .from('vagas')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Cancelada');

      setStats({
        vagasAbertas: data.vagas_abertas ?? 0,
        candidatosAtivos: data.candidatos_ativos ?? 0,
        vagasAtencao: data.vagas_atencao ?? 0,
        idsVagasAtencao: data.ids_vagas_atencao ?? [],
        mediaFechamento: data.media_dias_fechamento ?? 0,
        taxaAprovacao: data.taxa_aprovacao ?? 0,
        feedbacksPendentes: data.feedbacks_pendentes ?? 0,
        vagasCanceladas: canceladasCount ?? 0,
      });
      setError(false);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
      setError(true);
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

  const handleRetry = () => {
    setError(false);
    loadData();
  };

  const handleVagasAbertasClick = () => navigate('/vagas?status=ativas');
  const handleCandidatosAtivosClick = () => navigate('/candidatos?status=ativos');
  const handleAtencaoClick = () => {
    const ids = stats.idsVagasAtencao.join(',');
    navigate(`/vagas?attention=out_of_sla&ids=${encodeURIComponent(ids)}`);
  };
  const handleFeedbacksClick = () => navigate('/candidatos?attention=awaiting_client_feedback');
  const handleTempoMedioClick = () => navigate('/vagas?metric=avg_time_to_close');
  const handleTaxaAprovacaoClick = () => navigate('/relatorios?focus=conversion');
  const handleVagasCanceladasClick = () => navigate('/vagas?status=Cancelada');

  const copyPublicFormLink = () => {
    const link = `${window.location.origin}/solicitar-vaga`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado para a área de transferência!");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 md:px-8 py-6 max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-[32px] font-bold text-foreground mb-1">Dashboard</h1>
              <p className="text-[18px] text-muted-foreground">
                {userName && `Olá, ${userName}! `}Visão geral do sistema de recrutamento
              </p>
            </div>
            
            {/* Filtros - UI apenas por enquanto */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={periodFilter} disabled>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={recrutadorFilter} disabled>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Recrutador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os recrutadores</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={csFilter} disabled>
                <SelectTrigger className="w-[180px]">
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

      <div className="px-6 md:px-8 py-8 max-w-[1400px] mx-auto">
        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center justify-between">
            <p className="text-sm text-destructive-foreground">
              Não foi possível carregar os indicadores. Tente novamente.
            </p>
            <Button onClick={handleRetry} variant="outline" size="sm">
              Recarregar
            </Button>
          </div>
        )}

        {/* Ações Rápidas - Movidas para cima */}
        <div className="mb-6">
          <h2 className="text-base font-semibold text-foreground mb-3">Ações rápidas</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => navigate("/vagas/nova")} 
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all duration-150 rounded-xl h-11"
            >
              <Plus className="mr-2 h-5 w-5" />
              Nova Vaga
            </Button>
            <Button 
              onClick={() => navigate("/candidatos/novo")} 
              variant="outline"
              className="flex-1 border-2 hover:bg-muted transition-all duration-150 rounded-xl h-11"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              Novo Candidato
            </Button>
            <Button 
              onClick={copyPublicFormLink}
              variant="outline"
              className="flex-1 border-2 hover:bg-muted transition-all duration-150 rounded-xl h-11"
            >
              <Share2 className="mr-2 h-5 w-5" />
              Compartilhar Formulário
            </Button>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid gap-6 mb-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <>
              <KPISkeleton />
              <KPISkeleton />
              <KPISkeleton />
              <KPISkeleton />
              <KPISkeleton />
              <KPISkeleton />
              <KPISkeleton />
            </>
          ) : (
            <>
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

              {/* 2. Candidatos Ativos */}
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

              {/* 3. Atenção Necessária */}
              <KPICard
                title="Atenção Necessária"
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

              {/* 4. Feedbacks Pendentes */}
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

              {/* 7. Vagas Canceladas */}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}