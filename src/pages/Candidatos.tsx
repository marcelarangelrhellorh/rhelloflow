import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { StatsHeader } from "@/components/Candidatos/StatsHeader";
import { FilterBar } from "@/components/Candidatos/FilterBar";
import { CandidateCard } from "@/components/Candidatos/CandidateCard";
import { CandidateModal } from "@/components/Candidatos/CandidateModal";
import { LinkToJobModal } from "@/components/BancoTalentos/LinkToJobModal";

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
};

export default function Candidatos() {
  const navigate = useNavigate();
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [recrutadorFilter, setRecrutadorFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

    try {
      const { error } = await supabase
        .from("candidatos")
        .delete()
        .eq("id", deletingId);

      if (error) throw error;

      toast.success("Candidato excluído com sucesso");
      loadCandidatos();
    } catch (error) {
      console.error("Erro ao excluir candidato:", error);
      toast.error("Erro ao excluir candidato");
    } finally {
      setDeletingId(null);
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
    
    // Filtro de atenção: candidatos aguardando feedback do cliente
    const matchesAttention = attentionFilter !== 'awaiting_client_feedback' || candidato.status === 'Entrevistas Solicitante';
    
    return matchesSearch && matchesStatus && matchesRecrutador && matchesArea && matchesAttention;
  });

  const hasActiveFilter = attentionFilter === 'awaiting_client_feedback';
  
  const clearAttentionFilter = () => {
    navigate('/candidatos');
    window.location.reload();
  };

  // Get unique values for filters
  const recrutadores = Array.from(new Set(candidatos.map(c => c.recrutador).filter(Boolean))) as string[];
  const areas = Array.from(new Set(candidatos.map(c => c.area).filter(Boolean))) as string[];

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
    <div className="min-h-screen bg-secondary/30">
      {/* Header - Fixed */}
      <div className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Candidatos</h1>
              <p className="text-muted-foreground mt-1">Gerencie todos os candidatos</p>
            </div>
            <Button onClick={() => setModalOpen(true)} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Novo Candidato
            </Button>
          </div>

          {/* Stats */}
          <StatsHeader total={candidatos.length} byStatus={statsByStatus} />

          {/* Filter chip */}
          {hasActiveFilter && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-purple/10 border border-purple/20 rounded-lg">
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
          <div className="mt-4">
            <FilterBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              recrutadorFilter={recrutadorFilter}
              onRecrutadorChange={setRecrutadorFilter}
              areaFilter={areaFilter}
              onAreaChange={setAreaFilter}
              recrutadores={recrutadores}
              areas={areas}
            />
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="px-6 py-6">
        {filteredCandidatos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-6">
              <Plus className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Nenhum candidato encontrado
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              💛 Adicione um novo clicando em "+ Novo Candidato"
            </p>
            <Button onClick={() => setModalOpen(true)} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Novo Candidato
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCandidatos.map((candidato) => (
              <CandidateCard
                key={candidato.id}
                candidato={candidato}
                onView={() => navigate(`/candidatos/${candidato.id}`)}
                onEdit={() => {
                  setEditingId(candidato.id);
                  setModalOpen(true);
                }}
                onDelete={() => setDeletingId(candidato.id)}
                onLinkJob={() => setLinkingJobId(candidato.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <CandidateModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingId(null);
        }}
        candidatoId={editingId}
        onSave={loadCandidatos}
      />

      <LinkToJobModal
        open={!!linkingJobId}
        onOpenChange={() => setLinkingJobId(null)}
        candidateId={linkingJobId || ""}
        onSuccess={loadCandidatos}
      />

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este candidato? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
