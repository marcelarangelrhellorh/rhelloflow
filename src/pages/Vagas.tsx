import { useEffect, useState, useMemo, useCallback, Suspense, lazy } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, AlertTriangle, Grid3x3, List, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { VagaCard } from "@/components/VagaCard";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { logger } from "@/lib/logger";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardSkeletonGrid, FunnelSkeleton } from "@/components/skeletons";
import { VagasSkeleton } from "@/components/skeletons/VagasSkeleton";

// Lazy load heavy components
const VagasDashboard = lazy(() => import("@/components/FunilVagas/VagasDashboard").then(m => ({
  default: m.VagasDashboard
})));
const PipelineBoard = lazy(() => import("@/components/FunilVagas/PipelineBoard").then(m => ({
  default: m.PipelineBoard
})));
import { JOB_STAGES, calculateProgress } from "@/lib/jobStages";
import { logVagaEvento } from "@/lib/vagaEventos";
import { getBusinessDaysFromNow } from "@/lib/dateUtils";
type Vaga = {
  id: string;
  titulo: string;
  empresa: string;
  recrutador: string | null;
  cs_responsavel: string | null;
  status: string;
  status_slug: string;
  status_order: number;
  complexidade: string | null;
  prioridade: string | null;
  criado_em: string;
  candidatos_count?: number;
  confidencial?: boolean | null;
  area?: string | null;
  dias_etapa_atual?: number;
};
type StatusRef = {
  slug: string;
  label: string;
  color: string;
  order: number;
};
export default function Vagas() {
  const navigate = useNavigate();
  const [viewType, setViewType] = useState<"cards" | "funnel">("cards");
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [statusOptions, setStatusOptions] = useState<StatusRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [recrutadorFilter, setRecrutadorFilter] = useState<string>("all");
  const [clienteFilter, setClienteFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Estados específicos do funil
  const [mediaDiasAbertos, setMediaDiasAbertos] = useState(0);
  const [vagasForaPrazo, setVagasForaPrazo] = useState(0);
  const [totalCandidatosAtivos, setTotalCandidatosAtivos] = useState(0);
  const [ordenacao, setOrdenacao] = useState("recentes");
  const [recrutadores, setRecrutadores] = useState<string[]>([]);
  const [clientes, setClientes] = useState<string[]>([]);

  // Verificar se há filtro de atenção pela URL
  const searchParams = new URLSearchParams(window.location.search);
  const attentionFilter = searchParams.get('attention');
  const attentionIds = searchParams.get('ids')?.split(',') || [];
  useEffect(() => {
    loadStatusOptions();
    loadVagas();
  }, []);
  const loadStatusOptions = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("vaga_status_ref").select("slug, label, color, order").order("order");
      if (error) throw error;
      setStatusOptions(data || []);
    } catch (error) {
      logger.error("Erro ao carregar status:", error);
    }
  };
  const loadVagas = async () => {
    try {
      let query = supabase.from("vw_vagas_com_stats").select("*");
      if (viewType === "funnel") {
        query = query.neq("status_slug", "cancelada").is("deleted_at", null).order("status_order", {
          ascending: true
        });
      } else {
        query = query.is("deleted_at", null).order("criado_em", {
          ascending: false
        });
      }
      const {
        data: vagasData,
        error: vagasError
      } = await query;
      if (vagasError) throw vagasError;
      const vagasWithCounts = (vagasData || []).map(vaga => ({
        ...vaga,
        candidatos_count: vaga.candidatos_count || 0,
        dias_etapa_atual: vaga.dias_etapa_atual || 0
      }));
      setVagas(vagasWithCounts);
      calculateFunnelStats(vagasWithCounts);

      // Extrair opções de filtro
      const uniqueRecrutadores = Array.from(new Set(vagasWithCounts.map(v => v.recrutador).filter(Boolean))) as string[];
      const uniqueClientes = Array.from(new Set(vagasWithCounts.map(v => v.empresa).filter(Boolean))) as string[];
      setRecrutadores(uniqueRecrutadores);
      setClientes(uniqueClientes);
    } catch (error) {
      logger.error("Erro ao carregar vagas:", error);
      toast.error("Erro ao carregar vagas");
    } finally {
      setLoading(false);
    }
  };
  const calculateFunnelStats = async (vagasData: Vaga[]) => {
    const diasAbertos = vagasData.filter(v => v.status_slug !== "concluida" && v.status_slug !== "cancelada").map(v => getBusinessDaysFromNow(v.criado_em || ""));
    const media = diasAbertos.length > 0 ? Math.round(diasAbertos.reduce((a, b) => a + b, 0) / diasAbertos.length) : 0;
    setMediaDiasAbertos(media);
    const foraPrazo = diasAbertos.filter(dias => dias > 30).length;
    setVagasForaPrazo(foraPrazo);
    const {
      count
    } = await supabase.from("candidatos").select("*", {
      count: "exact",
      head: true
    }).neq("status", "Contratado").neq("status", "Reprovado rhello").neq("status", "Reprovado Solicitante");
    setTotalCandidatosAtivos(count || 0);
  };
  const filteredVagas = vagas.filter(vaga => {
    const matchesSearch = vaga.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || vaga.empresa.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || vaga.status === statusFilter;
    const matchesRecrutador = recrutadorFilter === "all" || vaga.recrutador === recrutadorFilter;
    const matchesCliente = clienteFilter === "all" || vaga.empresa === clienteFilter;
    const matchesAttention = !attentionFilter || attentionIds.includes(vaga.id);
    return matchesSearch && matchesStatus && matchesRecrutador && matchesCliente && matchesAttention;
  });
  const sortedVagas = [...filteredVagas].sort((a, b) => {
    if (ordenacao === "recentes") {
      return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
    } else if (ordenacao === "antigas") {
      return new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime();
    } else if (ordenacao === "prioridade") {
      const prioridadeOrder: {
        [key: string]: number;
      } = {
        Alta: 1,
        Média: 2,
        Baixa: 3
      };
      return (prioridadeOrder[a.prioridade || "Baixa"] || 3) - (prioridadeOrder[b.prioridade || "Baixa"] || 3);
    }
    return 0;
  });
  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    canGoNext,
    canGoPrevious,
    startIndex,
    endIndex
  } = usePagination(sortedVagas, 12);
  const totalItems = sortedVagas.length;
  const handleCardClick = (id: string) => {
    navigate(`/vagas/${id}`);
  };
  const handleMoveJob = async (jobId: string, fromSlug: string, toSlug: string) => {
    const job = vagas.find(j => j.id === jobId);
    if (!job) return;
    const oldStatusSlug = job.status_slug;
    const oldStatusLabel = job.status;
    const newStage = JOB_STAGES.find(s => s.slug === toSlug);
    if (!newStage) return;
    setVagas(prev => prev.map(j => j.id === jobId ? {
      ...j,
      status: newStage.name,
      status_slug: newStage.slug,
      status_order: newStage.order
    } : j));
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      const {
        error
      } = await supabase.from("vagas").update({
        status: newStage.name as any,
        status_slug: newStage.slug,
        status_order: newStage.order
      }).eq("id", jobId);
      if (error) throw error;
      await logVagaEvento({
        vagaId: jobId,
        actorUserId: user?.id,
        tipo: "ETAPA_ALTERADA",
        descricao: `Etapa alterada de "${oldStatusLabel}" para "${newStage.name}"`,
        payload: {
          old_status: oldStatusLabel,
          old_status_slug: oldStatusSlug,
          new_status: newStage.name,
          new_status_slug: newStage.slug
        }
      });
      toast.success(`Vaga movida para ${newStage.name}`);
      await loadVagas();
    } catch (error) {
      logger.error("Erro ao mover vaga:", error);
      toast.error("Erro ao mover vaga");
      setVagas(prev => prev.map(j => j.id === jobId ? {
        ...j,
        status: oldStatusLabel,
        status_slug: oldStatusSlug
      } : j));
    }
  };
  useEffect(() => {
    loadVagas();
  }, [viewType]);
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b border-border shadow-sm">
        <div className="px-6 py-4 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Vagas</h1>
              <p className="text-base text-muted-foreground">
                {viewType === "cards" ? "Gerencie todas as vagas abertas" : "Visualize o pipeline completo de vagas"}
              </p>
            </div>
            <Button onClick={() => navigate("/vagas/nova")} className="bg-[#00141d] hover:bg-[#00141d]/90 text-white font-bold h-11 text-sm px-4">
              <Plus className="mr-2 h-4 w-4" />
              Nova Vaga
            </Button>
          </div>
        </div>
      </div>

      {/* Layout em 2 colunas */}
      <div className="p-6 bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Coluna Esquerda - Conteúdo Principal */}
          <div className="lg:col-span-3 space-y-4">
            {/* Tabs de Visualização */}
            <Tabs value={viewType} onValueChange={v => setViewType(v as "cards" | "funnel")}>
              <TabsList className="grid w-full max-w-[400px] grid-cols-2 bg-background border border-border">
                <TabsTrigger value="cards" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">
                  <Grid3x3 className="h-4 w-4" />
                  Cards
                </TabsTrigger>
                <TabsTrigger value="funnel" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">
                  <LayoutGrid className="h-4 w-4" />
                  Funil
                </TabsTrigger>
              </TabsList>

              {/* Filtros Unificados */}
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input placeholder="Buscar por título ou empresa..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 text-base font-medium" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px] text-base font-medium">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-base font-medium">Todos</SelectItem>
                    {statusOptions.map(status => <SelectItem key={status.slug} value={status.label} className="text-base font-medium">
                        {status.label}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={recrutadorFilter} onValueChange={setRecrutadorFilter}>
                  <SelectTrigger className="w-[160px] text-base font-medium">
                    <SelectValue placeholder="Recrutador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-base font-medium">Todos</SelectItem>
                    {recrutadores.map(rec => <SelectItem key={rec} value={rec} className="text-base font-medium">{rec}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={clienteFilter} onValueChange={setClienteFilter}>
                  <SelectTrigger className="w-[160px] text-base font-medium">
                    <SelectValue placeholder="Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-base font-medium">Todos</SelectItem>
                    {clientes.map(cliente => <SelectItem key={cliente} value={cliente} className="text-base font-medium">{cliente}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={ordenacao} onValueChange={setOrdenacao}>
                  <SelectTrigger className="w-[140px] text-base font-medium">
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recentes" className="text-base font-medium">Recentes</SelectItem>
                    <SelectItem value="antigas" className="text-base font-medium">Antigas</SelectItem>
                    <SelectItem value="prioridade" className="text-base font-medium">Prioridade</SelectItem>
                  </SelectContent>
                </Select>
                {viewType === "cards" && <div className="flex border rounded-lg overflow-hidden shrink-0">
                    <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon" onClick={() => setViewMode("grid")} className="rounded-none">
                      <Grid3x3 className="h-4 w-4" />
                    </Button>
                    <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" onClick={() => setViewMode("list")} className="rounded-none">
                      <List className="h-4 w-4" />
                    </Button>
                  </div>}
              </div>

              {/* Alerta de Atenção */}
              {attentionFilter && <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-start gap-3 mt-4">
                  <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-warning">Vagas que precisam de atenção</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Mostrando {filteredVagas.length} vaga(s) fora do prazo (mais de 30 dias úteis)
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => {
                window.history.pushState({}, "", "/vagas");
                window.location.reload();
              }}>
                    Limpar filtro
                  </Button>
                </div>}

              {/* Conteúdo Cards */}
              <TabsContent value="cards" className="mt-4">
                {loading ? <CardSkeletonGrid count={8} /> : paginatedData.length === 0 ? <div className="text-center py-12">
                    <p className="text-muted-foreground">Nenhuma vaga encontrada</p>
                  </div> : <>
                    <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-4"}>
                      {paginatedData.map(vaga => <VagaCard key={vaga.id} vaga={vaga} onClick={() => handleCardClick(vaga.id)} viewMode={viewMode} />)}
                    </div>
                    <div className="mt-6">
                      <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} canGoNext={canGoNext} canGoPrevious={canGoPrevious} startIndex={startIndex} endIndex={endIndex} totalItems={totalItems} />
                    </div>
                  </>}
              </TabsContent>

              {/* Conteúdo Funil */}
              <TabsContent value="funnel" className="mt-4">
                {loading ? <CardSkeletonGrid count={6} /> : <PipelineBoard stages={JOB_STAGES.filter(s => s.slug !== "cancelada")} jobs={filteredVagas} progresso={(statusSlug: string) => calculateProgress(statusSlug)} onJobMove={handleMoveJob} onJobClick={id => navigate(`/vagas/${id}`)} onJobEdit={id => navigate(`/vagas/${id}/editar`)} onJobMoveStage={id => navigate(`/vagas/${id}/editar`)} onJobDuplicate={() => {}} onJobClose={() => {}} />}
              </TabsContent>
            </Tabs>
          </div>

          {/* Coluna Direita - Dashboard */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <VagasDashboard vagas={vagas} mediaDiasAbertos={mediaDiasAbertos} vagasForaPrazo={vagasForaPrazo} totalCandidatosAtivos={totalCandidatosAtivos} />
            </div>
          </div>
        </div>
      </div>
    </div>;
}