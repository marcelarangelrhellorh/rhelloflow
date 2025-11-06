import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, MessageSquare, X, AlertTriangle, Grid3x3, List } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { StatsHeader } from "@/components/Candidatos/StatsHeader";
import { FilterBar } from "@/components/Candidatos/FilterBar";
import { CandidateCard } from "@/components/Candidatos/CandidateCard";
import { LinkToJobModal } from "@/components/BancoTalentos/LinkToJobModal";
import { handleDelete as performDeletion } from "@/lib/deletionUtils";
import { useUserRole } from "@/hooks/useUserRole";

type Candidato = {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  nivel: string | null;
  area: string | null;
  status: string;
  recrutador: string | null;
  vaga_relacionada_id: string | null;
  disponibilidade_status?: string | null;
};

export default function Candidatos() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [recrutadorFilter, setRecrutadorFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [nivelFilter, setNivelFilter] = useState<string>("all");
  const [disponibilidadeFilter, setDisponibilidadeFilter] = useState<string>("disponível");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletionReason, setDeletionReason] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [linkingJobId, setLinkingJobId] = useState<string | null>(null);

  // Verificar se há filtro de atenção pela URL
  const searchParams = new URLSearchParams(window.location.search);
  const attentionFilter = searchParams.get('attention');

  useEffect(() => {
    loadCandidatos();
  }, []);

  const loadCandidatos = async () => {
    try {
      const { data, error } = await supabase
        .from("candidatos")
        .select("*")
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setCandidatos(data || []);
    } catch (error) {
      console.error("Erro ao carregar candidatos:", error);
      toast.error("Erro ao carregar candidatos");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    // Para admins, o motivo é opcional
    if (!isAdmin && !deletionReason.trim()) {
      toast.error("❌ Por favor, informe o motivo da exclusão");
      return;
    }

    try {
      // Find the candidate to get their data for snapshot
      const candidato = candidatos.find(c => c.id === deletingId);
      if (!candidato) {
        toast.error("❌ Candidato não encontrado");
        return;
      }

      // Create pre-delete snapshot
      const preSnapshot = {
        id: candidato.id,
        nome_completo: candidato.nome_completo,
        email: candidato.email,
        telefone: candidato.telefone,
        status: candidato.status,
        recrutador: candidato.recrutador,
        vaga_relacionada_id: candidato.vaga_relacionada_id,
      };

      const result = await performDeletion(
        "candidate",
        deletingId,
        candidato.nome_completo,
        deletionReason.trim() || (isAdmin ? "Exclusão por admin sem motivo especificado" : ""),
        preSnapshot
      );

      if (!result.success) {
        toast.error(`❌ ${result.error || "Erro ao excluir candidato"}`);
        return;
      }

      if (result.requiresApproval) {
        setRequiresApproval(true);
        toast.info("⚠️ Este candidato possui processos ativos. Solicitação de exclusão enviada para aprovação de admin.", {
          duration: 5000,
        });
        setDeletingId(null);
        return;
      }

      toast.success("✅ Candidato marcado para exclusão com sucesso");
      loadCandidatos();
    } catch (error) {
      console.error("Erro ao excluir candidato:", error);
      toast.error("❌ Erro ao excluir candidato");
    } finally {
      setDeletingId(null);
      setDeletionReason("");
      setRequiresApproval(false);
    }
  };

  const filteredCandidatos = candidatos.filter((candidato) => {
    const matchesSearch = 
      candidato.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidato.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (candidato.cidade && candidato.cidade.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || candidato.status === statusFilter;
    const matchesRecrutador = recrutadorFilter === "all" || candidato.recrutador === recrutadorFilter;
    const matchesArea = areaFilter === "all" || candidato.area === areaFilter;
    const matchesNivel = nivelFilter === "all" || candidato.nivel === nivelFilter;
    const matchesDisponibilidade = disponibilidadeFilter === "all" || 
      candidato.disponibilidade_status === disponibilidadeFilter;
    
    // Filtro de atenção: candidatos aguardando feedback do cliente
    const matchesAttention = attentionFilter !== 'awaiting_client_feedback' || candidato.status === 'Entrevistas Solicitante';
    
    return matchesSearch && matchesStatus && matchesRecrutador && matchesArea && matchesNivel && matchesDisponibilidade && matchesAttention;
  });

  const hasActiveFilter = attentionFilter === 'awaiting_client_feedback';
  
  const clearAttentionFilter = () => {
    navigate('/candidatos');
    window.location.reload();
  };

  // Get unique values for filters
  const recrutadores = Array.from(new Set(candidatos.map(c => c.recrutador).filter(Boolean))) as string[];
  const areas = Array.from(new Set(candidatos.map(c => c.area).filter(Boolean))) as string[];
  const niveis = Array.from(new Set(candidatos.map(c => c.nivel).filter(Boolean))) as string[];

  // Calculate stats
  const statsByStatus = candidatos.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/30">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light">
      {/* Header - Fixed */}
      <div className="sticky top-0 z-20 bg-background border-b border-border shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Candidatos</h1>
              <p className="text-muted-foreground">Gerencie todos os candidatos</p>
            </div>
            <Button 
              onClick={() => navigate('/candidatos/novo')}
              className="bg-[#F9EC3F] hover:bg-[#E5D72E] text-[#00141D] font-bold"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Candidato
            </Button>
          </div>

          {/* Stats */}
          <StatsHeader total={candidatos.length} byStatus={statsByStatus} />

          {/* Filter chip */}
          {hasActiveFilter && (
            <div className="mt-3 flex items-center gap-2 p-2 bg-purple/10 border border-purple/20 rounded-lg">
              <MessageSquare className="h-4 w-4 text-purple" />
              <span className="text-sm font-medium">
                Aguardando feedback do cliente
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={clearAttentionFilter}
                className="ml-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Filters */}
          <div className="mt-3 flex items-center gap-2">
            <FilterBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              recrutadorFilter={recrutadorFilter}
              onRecrutadorChange={setRecrutadorFilter}
              areaFilter={areaFilter}
              onAreaChange={setAreaFilter}
              nivelFilter={nivelFilter}
              onNivelChange={setNivelFilter}
              disponibilidadeFilter={disponibilidadeFilter}
              onDisponibilidadeChange={setDisponibilidadeFilter}
              recrutadores={recrutadores}
              areas={areas}
              niveis={niveis}
            />
            
            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
                className={viewMode === "grid" ? "bg-[#F9EC3F] text-[#00141D] hover:bg-[#E5D72E]" : ""}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "bg-[#F9EC3F] text-[#00141D] hover:bg-[#E5D72E]" : ""}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="px-6 py-4">
        {filteredCandidatos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 rounded-full bg-primary/10 p-4">
              <Plus className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum candidato encontrado
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              💛 Adicione um novo clicando em "+ Novo Candidato"
            </p>
            <Button 
              onClick={() => navigate('/candidatos/novo')}
              className="bg-[#F9EC3F] hover:bg-[#E5D72E] text-[#00141D] font-bold"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Candidato
            </Button>
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-4"}>
            {filteredCandidatos.map((candidato) => (
              <CandidateCard
                key={candidato.id}
                candidato={candidato}
                onView={() => navigate(`/candidatos/${candidato.id}`)}
                onEdit={() => navigate(`/candidatos/${candidato.id}/editar`)}
                onDelete={() => setDeletingId(candidato.id)}
                onLinkJob={() => setLinkingJobId(candidato.id)}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <LinkToJobModal
        open={!!linkingJobId}
        onOpenChange={() => setLinkingJobId(null)}
        candidateId={linkingJobId || ""}
        onSuccess={loadCandidatos}
      />

      <AlertDialog open={!!deletingId} onOpenChange={() => {
        setDeletingId(null);
        setDeletionReason("");
      }}>
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
              <p className="text-sm font-semibold mb-1">⚠️ Atenção:</p>
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
              <Input
                id="candidate-deletion-reason"
                placeholder="Ex: Candidato desistiu, duplicado, contratado em outro processo..."
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={!isAdmin && !deletionReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
