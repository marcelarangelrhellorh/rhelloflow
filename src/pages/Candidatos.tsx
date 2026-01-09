import { useState, useMemo, useCallback, Suspense, lazy } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, MessageSquare, X, AlertTriangle, Grid3x3, List, FileSpreadsheet, LayoutGrid, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FilterBar } from "@/components/Candidatos/FilterBar";
import { CandidateCard } from "@/components/Candidatos/CandidateCard";
import { LinkToJobModal } from "@/components/BancoTalentos/LinkToJobModal";
import { RejectionFeedbackModal } from "@/components/Candidatos/RejectionFeedbackModal";
import { ImportXlsModal } from "@/components/ImportXlsModal";
import { handleDelete as performDeletion } from "@/lib/deletionUtils";
import { useUserRole } from "@/hooks/useUserRole";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { logger } from "@/lib/logger";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DualScrollContainer } from "@/components/ui/dual-scroll-container";
import { CandidatosSkeleton } from "@/components/skeletons/CandidatosSkeleton";
import { useNotifications } from "@/hooks/useNotifications";
import { useCandidatosListQuery, CandidatoListItem } from "@/hooks/data/useCandidatosListQuery";
import { useVagasListQuery } from "@/hooks/data/useVagasListQuery";
import { useUsersQuery } from "@/hooks/data/useUsersQuery";

// Lazy load heavy components
const CandidatosDashboard = lazy(() => import("@/components/Candidatos/CandidatosDashboard").then(m => ({ default: m.CandidatosDashboard })));
const FunnelColumn = lazy(() => import("@/components/FunilCandidatos/FunnelColumn").then(m => ({ default: m.FunnelColumn })));
const CandidateFunnelCard = lazy(() => import("@/components/FunilCandidatos/CandidateFunnelCard").then(m => ({ default: m.CandidateFunnelCard })));

// Importar componentes do Funil
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { FilterBar as FunnelFilterBar } from "@/components/FunilCandidatos/FilterBar";

type Candidato = CandidatoListItem;

type StatusCandidato = "Triagem" | "Assessment | Teste Técnico" | "Entrevista" | "Shortlist" | "Reprovado" | "Contratado";

const statusColumns: StatusCandidato[] = [
  "Triagem",
  "Assessment | Teste Técnico",
  "Entrevista",
  "Shortlist",
  "Reprovado",
  "Contratado"
];

const statusColors: Record<StatusCandidato, string> = {
  "Triagem": "bg-slate-100 text-slate-800 border-slate-200",
  "Assessment | Teste Técnico": "bg-purple-100 text-purple-800 border-purple-200",
  "Entrevista": "bg-blue-100 text-blue-800 border-blue-200",
  "Shortlist": "bg-amber-100 text-amber-800 border-amber-200",
  "Reprovado": "bg-red-100 text-red-800 border-red-200",
  "Contratado": "bg-green-100 text-green-800 border-green-200"
};

export default function Candidatos() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const { notifyClientsAboutShortlist } = useNotifications();

  // ============ REACT QUERY HOOKS ============
  const { 
    candidatos, 
    isLoading: candidatosLoading, 
    updateStatus,
    invalidate: invalidateCandidatos 
  } = useCandidatosListQuery();
  
  const { vagas, isLoading: vagasLoading } = useVagasListQuery();
  const { users } = useUsersQuery();
  
  const loading = candidatosLoading || vagasLoading;

  // Estados de UI
  const [viewType, setViewType] = useState<"cards" | "funnel">("cards");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [disponibilidadeFilter, setDisponibilidadeFilter] = useState<string>("disponível");
  const [vagaFilter, setVagaFilter] = useState<string>("all");
  const [clienteFilter, setClienteFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletionReason, setDeletionReason] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [linkingJobId, setLinkingJobId] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Estados específicos do funil
  const [activeId, setActiveId] = useState<string | null>(null);
  const [recrutadorVagaFilter, setRecrutadorVagaFilter] = useState<string>("all");
  const [recrutadorFilter, setRecrutadorFilter] = useState<string>("all");
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Estado para modal de feedback de reprovação
  const [rejectionModalData, setRejectionModalData] = useState<{
    candidatoId: string;
    candidatoName: string;
    vagaTitle?: string;
    vagaId?: string;
    previousStatus: string;
  } | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 8 }
  }));

  // Verificar se há filtro de atenção pela URL
  const searchParams = new URLSearchParams(window.location.search);
  const attentionFilter = searchParams.get('attention');

  // ============ MEMOIZED HANDLERS ============
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setDragOverColumn(null);
    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }
    const candidatoId = active.id as string;
    const newStatus = over.id as StatusCandidato;
    const candidato = candidatos.find(c => c.id === candidatoId);
    if (!candidato || candidato.status === newStatus) {
      setActiveId(null);
      return;
    }

    // Se o novo status é "Reprovado", abrir modal de confirmação de feedback
    if (newStatus === "Reprovado") {
      const vagaInfo = vagas.find(v => v.id === candidato.vaga_relacionada_id);
      setRejectionModalData({
        candidatoId: candidato.id,
        candidatoName: candidato.nome_completo,
        vagaTitle: vagaInfo?.titulo,
        vagaId: candidato.vaga_relacionada_id || undefined,
        previousStatus: candidato.status,
      });
      // Atualização otimista via mutation
      updateStatus({ id: candidatoId, status: newStatus });
      setActiveId(null);
      return;
    }

    // Atualização via mutation com optimistic update automático
    updateStatus(
      { id: candidatoId, status: newStatus },
      {
        onSuccess: () => {
          toast.success(`Candidato movido para ${newStatus}`);
          // Se moveu para Shortlist, notificar clientes externos
          if (newStatus === "Shortlist" && candidato.vaga_relacionada_id) {
            const vagaInfo = vagas.find(v => v.id === candidato.vaga_relacionada_id);
            if (vagaInfo) {
              notifyClientsAboutShortlist(
                candidato.nome_completo,
                candidato.vaga_relacionada_id,
                vagaInfo.titulo
              );
            }
          }
        },
        onError: () => {
          toast.error("Erro ao mover candidato");
        },
      }
    );
    setActiveId(null);
  }, [candidatos, vagas, notifyClientsAboutShortlist, updateStatus]);

  // Handler para confirmação de feedback de reprovação
  const handleRejectionFeedbackConfirm = useCallback(async (gaveFeedback: boolean) => {
    if (!rejectionModalData) return;

    const { candidatoId, vagaId, previousStatus } = rejectionModalData;

    try {
      updateStatus(
        { 
          id: candidatoId, 
          status: "Reprovado",
          additionalData: {
            rejection_feedback_given: gaveFeedback,
            rejection_feedback_at: gaveFeedback ? new Date().toISOString() : null,
            rejection_feedback_job_id: vagaId || null,
          }
        },
        {
          onSuccess: () => {
            toast.success(
              gaveFeedback 
                ? "Candidato movido para Reprovado (retorno já dado)" 
                : "Candidato movido para Reprovado (pendente de retorno)"
            );
          },
          onError: () => {
            toast.error("Erro ao mover candidato para reprovado");
          },
        }
      );
    } finally {
      setRejectionModalData(null);
    }
  }, [rejectionModalData, updateStatus]);

  const handleDelete = useCallback(async () => {
    if (!deletingId) return;

    if (!isAdmin && !deletionReason.trim()) {
      toast.error("Por favor, informe o motivo da exclusão");
      return;
    }
    try {
      const candidato = candidatos.find(c => c.id === deletingId);
      if (!candidato) {
        toast.error("Candidato não encontrado");
        return;
      }

      const preSnapshot = {
        id: candidato.id,
        nome_completo: candidato.nome_completo,
        email: candidato.email,
        telefone: candidato.telefone,
        status: candidato.status,
        recrutador: candidato.recrutador,
        vaga_relacionada_id: candidato.vaga_relacionada_id
      };
      const result = await performDeletion("candidate", deletingId, candidato.nome_completo, deletionReason.trim() || (isAdmin ? "Exclusão por admin sem motivo especificado" : ""), preSnapshot);
      if (!result.success) {
        toast.error(`${result.error || "Erro ao excluir candidato"}`);
        return;
      }
      if (result.requiresApproval) {
        setRequiresApproval(true);
        toast.info("Este candidato possui processos ativos. Solicitação de exclusão enviada para aprovação de admin.", { duration: 5000 });
        setDeletingId(null);
        return;
      }
      toast.success("Candidato marcado para exclusão com sucesso");
      invalidateCandidatos();
    } catch (error) {
      logger.error("Erro ao excluir candidato:", error);
      toast.error("Erro ao excluir candidato");
    } finally {
      setDeletingId(null);
      setDeletionReason("");
      setRequiresApproval(false);
    }
  }, [deletingId, isAdmin, deletionReason, candidatos, invalidateCandidatos]);

  const clearAttentionFilter = useCallback(() => {
    navigate('/candidatos');
    window.location.reload();
  }, [navigate]);

  // ============ MEMOIZED MODAL CALLBACKS ============
  const handleLinkJobModalClose = useCallback(() => {
    setLinkingJobId(null);
  }, []);

  const handleDeleteModalClose = useCallback(() => {
    setDeletingId(null);
    setDeletionReason("");
  }, []);

  // ============ MEMOIZED DERIVED DATA ============
  
  // Memoized clientes list
  const clientes = useMemo(() => {
    return Array.from(new Set(vagas.map(v => v.empresa).filter(Boolean))) as string[];
  }, [vagas]);

  // Memoized stats by status
  const statsByStatus = useMemo(() => {
    return candidatos.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [candidatos]);

  // Memoized recrutadores for funnel filter
  const recrutadoresVaga = useMemo(() => {
    return Array.from(new Set(vagas.map(v => v.recrutador_id).filter(Boolean)));
  }, [vagas]);

  const recrutadores = useMemo(() => {
    return Array.from(new Set(candidatos.map(c => c.recrutador).filter(Boolean))) as string[];
  }, [candidatos]);

  // ============ MEMOIZED FILTERED DATA ============
  
  // Filtragem para o funil (exclui Banco de Talentos)
  const filteredFunnelCandidates = useMemo(() => {
    return candidatos.filter(candidato => {
      // Excluir candidatos no Banco de Talentos (gerenciados em /banco-talentos)
      if (candidato.status === "Banco de Talentos") return false;
      
      const matchesSearch = debouncedSearch === "" || candidato.nome_completo.toLowerCase().includes(debouncedSearch.toLowerCase()) || candidato.email.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesVaga = vagaFilter === "all" || candidato.vaga_relacionada_id === vagaFilter;
      const matchesCliente = clienteFilter === "all" || candidato.vaga_relacionada_id && vagas.find(v => v.id === candidato.vaga_relacionada_id)?.empresa === clienteFilter;
      const matchesRecrutadorVaga = recrutadorVagaFilter === "all" || candidato.vaga_relacionada_id && vagas.find(v => v.id === candidato.vaga_relacionada_id)?.recrutador_id === recrutadorVagaFilter;
      const matchesRecrutador = recrutadorFilter === "all" || candidato.recrutador === recrutadorFilter;
      return matchesSearch && matchesVaga && matchesCliente && matchesRecrutadorVaga && matchesRecrutador;
    });
  }, [candidatos, debouncedSearch, vagaFilter, clienteFilter, recrutadorVagaFilter, recrutadorFilter, vagas]);

  // Filtragem para Cards (exclui Banco de Talentos)
  const filteredCandidatos = useMemo(() => {
    return candidatos.filter(candidato => {
      // Excluir candidatos no Banco de Talentos (gerenciados em /banco-talentos)
      if (candidato.status === "Banco de Talentos") return false;
      
      const matchesSearch = debouncedSearch === "" || candidato.nome_completo.toLowerCase().includes(debouncedSearch.toLowerCase()) || candidato.email.toLowerCase().includes(debouncedSearch.toLowerCase()) || candidato.cidade && candidato.cidade.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesStatus = statusFilter === "all" || candidato.status === statusFilter;
      const matchesDisponibilidade = disponibilidadeFilter === "all" || candidato.disponibilidade_status === disponibilidadeFilter;
      const matchesVaga = vagaFilter === "all" || candidato.vaga_relacionada_id === vagaFilter;
      const matchesCliente = clienteFilter === "all" || candidato.vaga_relacionada_id && vagas.find(v => v.id === candidato.vaga_relacionada_id)?.empresa === clienteFilter;
      const matchesAttention = attentionFilter !== 'awaiting_client_feedback' || candidato.status === 'Shortlist';
      return matchesSearch && matchesStatus && matchesDisponibilidade && matchesVaga && matchesCliente && matchesAttention;
    });
  }, [candidatos, debouncedSearch, statusFilter, disponibilidadeFilter, vagaFilter, clienteFilter, attentionFilter, vagas]);

  // Pre-compute candidates by status for funnel (avoids 6 separate filter calls)
  const candidatesByStatus = useMemo(() => {
    const grouped: Record<StatusCandidato, Candidato[]> = {
      "Triagem": [],
      "Assessment | Teste Técnico": [],
      "Entrevista": [],
      "Shortlist": [],
      "Reprovado": [],
      "Contratado": []
    };
    
    filteredFunnelCandidates.forEach(c => {
      if (grouped[c.status as StatusCandidato]) {
        grouped[c.status as StatusCandidato].push(c);
      }
    });
    
    return grouped;
  }, [filteredFunnelCandidates]);

  const hasActiveFilter = attentionFilter === 'awaiting_client_feedback';

  const {
    paginatedData: paginatedCandidatos,
    currentPage,
    totalPages,
    goToPage,
    canGoNext,
    canGoPrevious,
    startIndex,
    endIndex
  } = usePagination(filteredCandidatos, 50);

  // ============ MEMOIZED CARD HANDLERS (for map iterations) ============
  const handleViewCandidate = useCallback((id: string) => {
    navigate(`/candidatos/${id}`);
  }, [navigate]);

  const handleEditCandidate = useCallback((id: string) => {
    navigate(`/candidatos/${id}/editar`);
  }, [navigate]);

  const handleDeleteCandidate = useCallback((id: string) => {
    setDeletingId(id);
  }, []);

  const handleLinkJobCandidate = useCallback((id: string) => {
    setLinkingJobId(id);
  }, []);

  // Memoized vagas for funnel filter bar
  const vagasForFilter = useMemo(() => {
    return vagas.map(v => ({ id: v.id, titulo: v.titulo }));
  }, [vagas]);

  if (loading) {
    return <CandidatosSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Fixed */}
      <div className="sticky top-0 z-20 bg-background border-b border-border shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Candidatos</h1>
              <p className="text-base text-muted-foreground">
                {viewType === "cards" ? "Gerencie todos os candidatos" : "Visualize o pipeline completo de candidatos"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/banco-talentos')} className="font-bold">
                <Users className="mr-2 h-4 w-4" />
                Banco de Talentos
              </Button>
              <Button onClick={() => navigate('/candidatos/novo')} className="font-bold">
                <Plus className="mr-2 h-4 w-4" />
                Novo Candidato
              </Button>
              <Button onClick={() => setImportModalOpen(true)} className="font-bold">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Importar XLS
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Layout 2 Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6">
        {/* Coluna Principal (4/5) */}
        <div className="lg:col-span-4 space-y-4">
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
            <TabsContent value="cards" className="space-y-4 mt-4">
              {/* Filter chip */}
              {hasActiveFilter && (
                <div className="flex items-center gap-2 p-2 bg-purple/10 border border-purple/20 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-purple" />
                  <span className="text-base font-medium">Aguardando feedback do cliente</span>
                  <Button variant="ghost" size="sm" onClick={clearAttentionFilter} className="ml-auto">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Filters */}
              <div className="flex items-center gap-2 w-full">
                <div className="flex-1">
                  <FilterBar searchTerm={searchTerm} onSearchChange={setSearchTerm} statusFilter={statusFilter} onStatusChange={setStatusFilter} disponibilidadeFilter={disponibilidadeFilter} onDisponibilidadeChange={setDisponibilidadeFilter} vagaFilter={vagaFilter} onVagaChange={setVagaFilter} clienteFilter={clienteFilter} onClienteChange={setClienteFilter} vagas={vagas} clientes={clientes} />
                </div>
                
                <div className="flex gap-2 shrink-0">
                  <Button variant={viewMode === "grid" ? "default" : "outline"} size="icon" onClick={() => setViewMode("grid")} className={viewMode === "grid" ? "bg-[#F9EC3F] text-[#00141D] hover:bg-[#E5D72E]" : ""}>
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                  <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")} className={viewMode === "list" ? "bg-[#F9EC3F] text-[#00141D] hover:bg-[#E5D72E]" : ""}>
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Cards Content */}
              <div className="bg-[#36404a]/[0.12] rounded-lg p-4">
                {filteredCandidatos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 rounded-full bg-primary/10 p-4">
                      <Plus className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Nenhum candidato encontrado
                    </h3>
                    <p className="text-base text-muted-foreground mb-4 max-w-md">
                      Adicione um novo clicando em "+ Novo Candidato"
                    </p>
                    <Button onClick={() => navigate('/candidatos/novo')} className="bg-[#F9EC3F] hover:bg-[#E5D72E] text-[#00141D] font-bold">
                      <Plus className="mr-2 h-4 w-4" />
                      Novo Candidato
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-4"}>
                      {paginatedCandidatos.map(candidato => (
                        <CandidateCard 
                          key={candidato.id} 
                          candidato={candidato} 
                          onView={() => handleViewCandidate(candidato.id)} 
                          onEdit={() => handleEditCandidate(candidato.id)} 
                          onDelete={() => handleDeleteCandidate(candidato.id)} 
                          onLinkJob={() => handleLinkJobCandidate(candidato.id)} 
                          viewMode={viewMode} 
                        />
                      ))}
                    </div>
                    <div className="mt-6">
                      <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} canGoPrevious={canGoPrevious} canGoNext={canGoNext} startIndex={startIndex} endIndex={endIndex} totalItems={filteredCandidatos.length} />
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            {/* Visualização em Funil */}
            <TabsContent value="funnel" className="space-y-4 mt-4">
              <FunnelFilterBar 
                searchQuery={searchTerm} 
                onSearchChange={setSearchTerm} 
                vagaFilter={vagaFilter} 
                onVagaChange={setVagaFilter} 
                clienteFilter={clienteFilter} 
                onClienteChange={setClienteFilter} 
                recrutadorVagaFilter={recrutadorVagaFilter} 
                onRecrutadorVagaChange={setRecrutadorVagaFilter} 
                recrutadorFilter={recrutadorFilter} 
                onRecrutadorChange={setRecrutadorFilter} 
                vagas={vagasForFilter} 
                clientes={clientes} 
                recrutadoresVaga={recrutadoresVaga} 
                recrutadores={recrutadores} 
                users={users} 
              />

              <div className="bg-[#36404a]/[0.12] rounded-lg p-4">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                  <DualScrollContainer>
                    <div className="flex gap-4 pb-4">
                      {statusColumns.map(status => {
                        const candidatosStatus = candidatesByStatus[status];
                        return (
                          <FunnelColumn key={status} status={status} count={candidatosStatus.length} colorClass={statusColors[status]}>
                            {candidatosStatus.map(candidato => (
                              <div key={candidato.id} onClick={() => handleViewCandidate(candidato.id)}>
                                <CandidateFunnelCard candidato={candidato} onDragStart={() => {}} />
                              </div>
                            ))}
                          </FunnelColumn>
                        );
                      })}
                    </div>
                  </DualScrollContainer>

                  <DragOverlay>
                    {activeId ? (
                      <div className="w-[300px]">
                        <CandidateFunnelCard candidato={candidatos.find(c => c.id === activeId)!} onDragStart={() => {}} isDragging />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar Direita (1/5) */}
        <div className="lg:col-span-1">
          <CandidatosDashboard candidatos={candidatos} statsByStatus={statsByStatus} />
        </div>
      </div>

      {/* Modals */}
      <LinkToJobModal open={!!linkingJobId} onOpenChange={handleLinkJobModalClose} candidateId={linkingJobId || ""} onSuccess={invalidateCandidatos} />

      <AlertDialog open={!!deletingId} onOpenChange={handleDeleteModalClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar exclusão
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4 px-6">
            <p>Tem certeza que deseja excluir este candidato?</p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
              <p className="text-sm font-semibold mb-1">Atenção:</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Candidatos em processos ativos requerem aprovação de admin</li>
                <li>Todos os dados serão preservados para auditoria</li>
                <li>Esta ação pode ser revertida por administradores</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="candidate-deletion-reason" className="font-medium">
                Motivo da exclusão {!isAdmin && "*"}
              </Label>
              {isAdmin && (
                <p className="text-xs text-muted-foreground">
                  Como admin, você pode excluir sem especificar um motivo
                </p>
              )}
              <Input id="candidate-deletion-reason" placeholder="Ex: Candidato desistiu, duplicado, contratado em outro processo..." value={deletionReason} onChange={e => setDeletionReason(e.target.value)} />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={!isAdmin && !deletionReason.trim()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportXlsModal open={importModalOpen} onOpenChange={setImportModalOpen} sourceType="vaga" showVagaSelector={true} onSuccess={invalidateCandidatos} />

      {/* Modal de confirmação de feedback de reprovação */}
      <RejectionFeedbackModal
        open={!!rejectionModalData}
        onConfirm={handleRejectionFeedbackConfirm}
        candidateName={rejectionModalData?.candidatoName || ""}
        jobTitle={rejectionModalData?.vagaTitle}
      />
    </div>
  );
}
