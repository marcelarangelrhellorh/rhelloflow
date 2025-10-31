import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CandidateHeader } from "@/components/CandidatoDetalhes/CandidateHeader";
import { StatsBar } from "@/components/CandidatoDetalhes/StatsBar";
import { ContactCard } from "@/components/CandidatoDetalhes/ContactCard";
import { ProfessionalInfoCard } from "@/components/CandidatoDetalhes/ProfessionalInfoCard";
import { FeedbackList } from "@/components/CandidatoDetalhes/FeedbackList";
import { FeedbackModal } from "@/components/CandidatoDetalhes/FeedbackModal";
import { HistoryTimeline } from "@/components/CandidatoDetalhes/HistoryTimeline";
import { CandidateModal } from "@/components/Candidatos/CandidateModal";
import { LinkToJobModal } from "@/components/BancoTalentos/LinkToJobModal";

type Candidato = {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  linkedin: string | null;
  curriculo_link: string | null;
  curriculo_url: string | null;
  portfolio_url: string | null;
  nivel: string | null;
  area: string | null;
  status: string;
  recrutador: string | null;
  vaga_relacionada_id: string | null;
  pretensao_salarial: number | null;
  disponibilidade_mudanca: string | null;
  pontos_fortes: string | null;
  pontos_desenvolver: string | null;
  parecer_final: string | null;
  feedback: string | null;
  criado_em: string;
};

type Vaga = {
  id: string;
  titulo: string;
};

type Historico = {
  id: string;
  resultado: string;
  feedback: string | null;
  data: string | null;
  recrutador: string | null;
  vaga_id: string | null;
};

export default function CandidatoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidato, setCandidato] = useState<Candidato | null>(null);
  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [relocateModalOpen, setRelocateModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadCandidato();
      loadHistorico();

      // Subscribe to realtime updates
      const channel = supabase
        .channel('candidato-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'candidatos',
            filter: `id=eq.${id}`
          },
          (payload) => {
            console.log('Candidato atualizado:', payload);
            if (payload.eventType === 'UPDATE') {
              loadCandidato();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id]);

  const loadCandidato = async () => {
    try {
      const { data, error } = await supabase
        .from("candidatos")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setCandidato(data);

      if (data.vaga_relacionada_id) {
        const { data: vagaData } = await supabase
          .from("vagas")
          .select("id, titulo")
          .eq("id", data.vaga_relacionada_id)
          .single();
        setVaga(vagaData);
      }
    } catch (error) {
      console.error("Erro ao carregar candidato:", error);
      toast.error("Erro ao carregar candidato");
    } finally {
      setLoading(false);
    }
  };

  const loadHistorico = async () => {
    try {
      const { data, error } = await supabase
        .from("historico_candidatos")
        .select("*")
        .eq("candidato_id", id)
        .order("data", { ascending: false });

      if (error) throw error;
      setHistorico(data || []);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("candidatos")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Candidato excluído com sucesso!");
      navigate("/candidatos");
    } catch (error) {
      console.error("Erro ao excluir candidato:", error);
      toast.error("Erro ao excluir candidato");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/30">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!candidato) {
    return (
      <div className="min-h-screen bg-secondary/30 p-8">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Candidato não encontrado</p>
          <Button onClick={() => navigate("/candidatos")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Candidatos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Breadcrumb / Back Button */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="px-6 py-4">
          <Button variant="ghost" onClick={() => navigate("/candidatos")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar | Candidatos / {candidato.nome_completo}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <CandidateHeader
          nome={candidato.nome_completo}
          status={candidato.status}
          nivel={candidato.nivel}
          area={candidato.area}
          cidade={candidato.cidade}
          estado={candidato.estado}
          recrutador={candidato.recrutador}
          onEdit={() => setEditModalOpen(true)}
          onDelete={() => setDeleteDialogOpen(true)}
          onAddFeedback={() => setFeedbackModalOpen(true)}
          onRelocate={() => setRelocateModalOpen(true)}
        />

        {/* Stats Bar */}
        <StatsBar
          criadoEm={candidato.criado_em}
          ultimoFeedback={(candidato as any).ultimo_feedback || null}
          processosParticipados={historico.length}
          realocacoes={historico.filter(h => h.resultado !== "Contratado").length}
          totalFeedbacks={(candidato as any).total_feedbacks || 0}
        />

        {/* Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ContactCard
            email={candidato.email}
            telefone={candidato.telefone}
            cidade={candidato.cidade}
            estado={candidato.estado}
            linkedin={candidato.linkedin}
            curriculoLink={candidato.curriculo_link}
          />

          <ProfessionalInfoCard
            recrutador={candidato.recrutador}
            pretensaoSalarial={candidato.pretensao_salarial}
            vagaTitulo={vaga?.titulo || null}
            vagaId={candidato.vaga_relacionada_id}
            dataCadastro={candidato.criado_em}
            nivel={candidato.nivel}
            area={candidato.area}
            curriculoUrl={candidato.curriculo_url}
            portfolioUrl={candidato.portfolio_url}
            disponibilidadeMudanca={candidato.disponibilidade_mudanca}
            pontosFortes={candidato.pontos_fortes}
            pontosDesenvolver={candidato.pontos_desenvolver}
            parecerFinal={candidato.parecer_final}
            onVagaClick={() => vaga && navigate(`/vagas/${vaga.id}`)}
          />
        </div>

        {/* Feedbacks */}
        <FeedbackList
          candidatoId={id!}
          onAddFeedback={() => setFeedbackModalOpen(true)}
        />

        {/* History Timeline */}
        <HistoryTimeline
          historico={historico}
          onVagaClick={(vagaId) => navigate(`/vagas/${vagaId}`)}
        />
      </div>

      {/* Modals */}
      <CandidateModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        candidatoId={id}
        onSave={() => {
          loadCandidato();
          setEditModalOpen(false);
        }}
      />

      <LinkToJobModal
        open={relocateModalOpen}
        onOpenChange={setRelocateModalOpen}
        candidateId={id || ""}
        onSuccess={() => {
          loadCandidato();
          setRelocateModalOpen(false);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este candidato? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Feedback Modal */}
      <FeedbackModal
        open={feedbackModalOpen}
        onOpenChange={setFeedbackModalOpen}
        candidatoId={id!}
        vagaId={candidato.vaga_relacionada_id}
        etapaAtual={candidato.status}
        onSuccess={() => {
          loadCandidato();
        }}
      />
    </div>
  );
}
