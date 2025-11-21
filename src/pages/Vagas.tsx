import { useEffect, useState } from "react";
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

// Importar componentes do Funil
import { StatsHeader } from "@/components/FunilVagas/StatsHeader";
import { FilterBar } from "@/components/FunilVagas/FilterBar";
import { PipelineBoard } from "@/components/FunilVagas/PipelineBoard";
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
  const [csFilter, setCsFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [ordenacao, setOrdenacao] = useState("recentes");
  const [recrutadores, setRecrutadores] = useState<string[]>([]);
  const [csResponsaveis, setCsResponsaveis] = useState<string[]>([]);
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
      const query = viewType === "funnel" ? supabase.from("vagas").select(`
              *,
              recrutador_user:users!vagas_recrutador_id_fkey(name),
              cs_user:users!vagas_cs_id_fkey(name)
            `).neq("status_slug", "cancelada").is("deleted_at", null).order("status_order", {
        ascending: true
      }) : supabase.from("vagas").select(`
              *,
              recrutador_user:users!vagas_recrutador_id_fkey(name),
              cs_user:users!vagas_cs_id_fkey(name)
            `).is("deleted_at", null).order("criado_em", {
        ascending: false
      });
      const {
        data: vagasData,
        error: vagasError
      } = await query;
      if (vagasError) throw vagasError;

      // Load candidate counts for each vaga
      const vagasWithCounts = await Promise.all((vagasData || []).map(async vaga => {
        const {
          count
        } = await supabase.from("candidatos").select("*", {
          count: "exact",
          head: true
        }).eq("vaga_relacionada_id", vaga.id);

        // Para o funil, calcular dias na etapa atual
        let diasEtapaAtual = 0;
        if (viewType === "funnel") {
          const {
            data: lastStageChange
          } = await supabase.from("job_stage_history").select("changed_at").eq("job_id", vaga.id).order("changed_at", {
            ascending: false
          }).limit(1).single();
          if (lastStageChange) {
            diasEtapaAtual = getBusinessDaysFromNow(lastStageChange.changed_at);
          }
        }
        return {
          ...vaga,
          candidatos_count: count || 0,
          recrutador: vaga.recrutador_user?.name || vaga.recrutador || null,
          cs_responsavel: vaga.cs_user?.name || vaga.cs_responsavel || null,
          dias_etapa_atual: diasEtapaAtual
        };
      }));
      setVagas(vagasWithCounts);

      // Calcular estatísticas para o funil
      if (viewType === "funnel") {
        calculateFunnelStats(vagasWithCounts);
      }

      // Extrair opções de filtro
      const uniqueRecrutadores = Array.from(new Set(vagasWithCounts.map(v => v.recrutador).filter(Boolean))) as string[];
      const uniqueCS = Array.from(new Set(vagasWithCounts.map(v => v.cs_responsavel).filter(Boolean))) as string[];
      const uniqueClientes = Array.from(new Set(vagasWithCounts.map(v => v.empresa).filter(Boolean))) as string[];
      setRecrutadores(uniqueRecrutadores);
      setCsResponsaveis(uniqueCS);
      setClientes(uniqueClientes);
    } catch (error) {
      logger.error("Erro ao carregar vagas:", error);
      toast.error("Erro ao carregar vagas");
    } finally {
      setLoading(false);
    }
  };
  const calculateFunnelStats = async (vagasData: Vaga[]) => {
    // Calcular média de dias abertos
    const diasAbertos = vagasData.filter(v => v.status_slug !== "concluida" && v.status_slug !== "cancelada").map(v => getBusinessDaysFromNow(v.criado_em || ""));
    const media = diasAbertos.length > 0 ? Math.round(diasAbertos.reduce((a, b) => a + b, 0) / diasAbertos.length) : 0;
    setMediaDiasAbertos(media);

    // Vagas fora do prazo (>30 dias úteis)
    const foraPrazo = diasAbertos.filter(dias => dias > 30).length;
    setVagasForaPrazo(foraPrazo);

    // Total de candidatos ativos
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
    const matchesCS = csFilter === "all" || vaga.cs_responsavel === csFilter;
    const matchesArea = areaFilter === "all" || vaga.area === areaFilter;
    const matchesAttention = !attentionFilter || attentionIds.includes(vaga.id);
    return matchesSearch && matchesStatus && matchesRecrutador && matchesCliente && matchesCS && matchesArea && matchesAttention;
  });

  // Aplicar ordenação
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
    nextPage,
    previousPage,
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

    // Encontrar novo status
    const newStage = JOB_STAGES.find(s => s.slug === toSlug);
    if (!newStage) return;

    // Atualização otimista
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
  const copyShareLink = async (vagaId: string) => {
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("get-existing-link", {
        body: {
          vagaId
        }
      });
      if (error) throw error;
      if (data?.shareLink) {
        const fullUrl = `${window.location.origin}/share/${data.shareLink.token}`;
        await navigator.clipboard.writeText(fullUrl);
        toast.success("Link copiado!");
      } else {
        toast.error("Nenhum link ativo encontrado");
      }
    } catch (error) {
      logger.error("Erro ao copiar link:", error);
      toast.error("Erro ao copiar link");
    }
  };

  // Recarregar ao trocar de visualização
  useEffect(() => {
    loadVagas();
  }, [viewType]);
  return <div className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Vagas</h1>
            <p className="text-muted-foreground mt-1">
              {viewType === "cards" ? "Gerencie todas as vagas abertas" : "Visualize o pipeline completo de vagas"}
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => navigate("/vagas/nova")} className="bg-[#faec3e] text-slate-950 hover:bg-[#faec3e]/90 h-11 px-6 font-semibold">
              <Plus className="mr-2 h-4 w-4" />
              Nova Vaga
            </Button>
          </div>
        </div>

        {/* Toggle de Visualização */}
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

          {/* Visualização em Cards */}
          <TabsContent value="cards" className="space-y-6 mt-6">
            {/* Filtros e Busca */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input placeholder="Buscar por título ou empresa..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {statusOptions.map(status => <SelectItem key={status.slug} value={status.label}>
                        {status.label}
                      </SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={recrutadorFilter} onValueChange={setRecrutadorFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Recrutador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {recrutadores.map(rec => <SelectItem key={rec} value={rec}>
                        {rec}
                      </SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={clienteFilter} onValueChange={setClienteFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {clientes.map(cliente => <SelectItem key={cliente} value={cliente}>
                        {cliente}
                      </SelectItem>)}
                  </SelectContent>
                </Select>

                <div className="flex border rounded-lg overflow-hidden">
                  <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon" onClick={() => setViewMode("grid")} className="rounded-none">
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                  <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" onClick={() => setViewMode("list")} className="rounded-none">
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Alerta de Atenção */}
            {attentionFilter && <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-start gap-3">
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
          </TabsContent>

          {/* Visualização em Funil */}
          <TabsContent value="funnel" className="space-y-6 mt-6">
            <StatsHeader totalVagasAbertas={vagas.filter(v => v.status_slug !== "concluida" && v.status_slug !== "cancelada").length} mediaDiasAbertos={mediaDiasAbertos} vagasEmAtencao={vagasForaPrazo} totalCandidatosAtivos={totalCandidatosAtivos} />

            <FilterBar searchTerm={searchTerm} onSearchChange={setSearchTerm} recrutadorFilter={recrutadorFilter} onRecrutadorChange={setRecrutadorFilter} clienteFilter={clienteFilter} onClienteChange={setClienteFilter} areaFilter={areaFilter} onAreaChange={setAreaFilter} statusFilter={statusFilter} onStatusChange={setStatusFilter} ordenacao={ordenacao} onOrdenacaoChange={setOrdenacao} recrutadores={recrutadores} clientes={clientes} areas={[]} statusOptions={statusOptions} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Área de Conteúdo com Background Amarelo */}
      <div className="min-h-[60vh] bg-[#ffcd00]/20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-6">
          <Tabs value={viewType}>
            <TabsContent value="cards" className="mt-0">
              {/* Cards */}
              {loading ? <div className="text-center py-12">
                  <p className="text-[#FFFDF6]">Carregando vagas...</p>
                </div> : paginatedData.length === 0 ? <div className="text-center py-12">
                  <p className="text-[#FFFDF6]">Nenhuma vaga encontrada</p>
                </div> : <>
                  <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-6" : "space-y-4 pt-6"}>
                    {paginatedData.map(vaga => <VagaCard key={vaga.id} vaga={vaga} onClick={() => handleCardClick(vaga.id)} viewMode={viewMode} />)}
                  </div>

                  <div className="mt-6">
                    <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} canGoNext={canGoNext} canGoPrevious={canGoPrevious} startIndex={startIndex} endIndex={endIndex} totalItems={totalItems} />
                  </div>
                 </>}
            </TabsContent>

            <TabsContent value="funnel" className="mt-0">
              {loading ? <div className="text-center py-12">
                  <p className="text-[#FFFDF6]">Carregando vagas...</p>
                </div> : <div className="pt-6"><PipelineBoard stages={JOB_STAGES.filter(s => s.slug !== "cancelada")} jobs={filteredVagas} progresso={(statusSlug: string) => calculateProgress(statusSlug)} onJobMove={handleMoveJob} onJobClick={id => navigate(`/vagas/${id}`)} onJobEdit={id => navigate(`/vagas/${id}/editar`)} onJobMoveStage={id => navigate(`/vagas/${id}/editar`)} onJobDuplicate={() => {}} onJobClose={() => {}} /></div>}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>;
}