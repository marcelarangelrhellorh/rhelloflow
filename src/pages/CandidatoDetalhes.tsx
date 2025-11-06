import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CandidateHeader } from "@/components/CandidatoDetalhes/CandidateHeader";
import { StatsBar } from "@/components/CandidatoDetalhes/StatsBar";
import { ContactCard } from "@/components/CandidatoDetalhes/ContactCard";
import { ApplicationDataCard } from "@/components/CandidatoDetalhes/ApplicationDataCard";
import { ProfessionalInfoCard } from "@/components/CandidatoDetalhes/ProfessionalInfoCard";
import { FeedbackList } from "@/components/CandidatoDetalhes/FeedbackList";
import { FeedbackModal } from "@/components/CandidatoDetalhes/FeedbackModal";
import { SolicitarFeedbackModal } from "@/components/CandidatoDetalhes/SolicitarFeedbackModal";
import { HistoryTimeline } from "@/components/CandidatoDetalhes/HistoryTimeline";
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
  disponibilidade_status: string | null;
  pontos_fortes: string | null;
  pontos_desenvolver: string | null;
  parecer_final: string | null;
  feedback: string | null;
  criado_em: string;
  origem: string | null;
  source_link_id: string | null;
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
  const [stats, setStats] = useState<{
    ultimoFeedback: string | null;
    totalProcessos: number;
    mediaRating: number | null;
    qtdAvaliacoes: number;
    totalFeedbacks: number;
  }>({
    ultimoFeedback: null,
    totalProcessos: 0,
    mediaRating: null,
    qtdAvaliacoes: 0,
    totalFeedbacks: 0
  });
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [relocateModalOpen, setRelocateModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [solicitarFeedbackModalOpen, setSolicitarFeedbackModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadCandidato();
      loadHistorico();
      refreshStats();

      // Subscribe to realtime updates
      const candidatoChannel = supabase
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

      // Subscribe to feedback updates
      const feedbackChannel = supabase
        .channel('feedback-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'feedbacks',
            filter: `candidato_id=eq.${id}`
          },
          () => {
            refreshStats();
          }
        )
        .subscribe();

      // Subscribe to historico updates
      const historicoChannel = supabase
        .channel('historico-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'historico_candidatos',
            filter: `candidato_id=eq.${id}`
          },
          () => {
            loadHistorico();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(candidatoChannel);
        supabase.removeChannel(feedbackChannel);
        supabase.removeChannel(historicoChannel);
      };
    }
  }, [id]);

  const refreshStats = async () => {
    const newStats = await loadStats();
    setStats(newStats);
  };

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

  const loadStats = async () => {
    if (!id) return { ultimoFeedback: null, totalProcessos: 0, mediaRating: null, qtdAvaliacoes: 0, totalFeedbacks: 0 };

    try {
      // Buscar último feedback
      const { data: fbUltimo } = await supabase
        .from('feedbacks')
        .select('criado_em')
        .eq('candidato_id', id)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Buscar total de processos distintos
      const { data: processosData } = await supabase
        .from('candidatos')
        .select('vaga_relacionada_id')
        .eq('id', id);

      // Buscar estatísticas de avaliação
      const { data: ratingData } = await supabase
        .from('feedbacks')
        .select('avaliacao')
        .eq('candidato_id', id);

      const ratings = (ratingData || [])
        .map(f => f.avaliacao)
        .filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
      
      const mediaRating = ratings.length > 0 
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
        : null;

      return {
        ultimoFeedback: fbUltimo?.criado_em || null,
        totalProcessos: processosData?.[0]?.vaga_relacionada_id ? 1 : 0,
        mediaRating,
        qtdAvaliacoes: ratings.length,
        totalFeedbacks: ratingData?.length || 0
      };
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
      return { ultimoFeedback: null, totalProcessos: 0, mediaRating: null, qtdAvaliacoes: 0, totalFeedbacks: 0 };
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

  const handleStatusChange = async (newStatus: string) => {
    if (!id || !candidato) return;
    
    const oldStatus = candidato.status;
    
    try {
      // Atualizar status do candidato
      const { error: updateError } = await supabase
        .from("candidatos")
        .update({ status: newStatus as any })
        .eq("id", id);

      if (updateError) throw updateError;

      // Registrar no histórico com resultado mapeado
      const resultadoHistorico = newStatus === "Contratado" ? "Contratado" : 
                                 newStatus.includes("Aprovado") ? "Aprovado" :
                                 newStatus.includes("Reprovado") ? "Reprovado" : "Em andamento";
      
      const { error: historicoError } = await supabase
        .from("historico_candidatos")
        .insert({
          candidato_id: id,
          vaga_id: candidato.vaga_relacionada_id,
          resultado: resultadoHistorico as "Aprovado" | "Reprovado" | "Contratado" | "Em andamento",
          recrutador: candidato.recrutador,
          feedback: `Etapa alterada de "${oldStatus}" para "${newStatus}"`,
        });

      if (historicoError) throw historicoError;

      toast.success(`✅ Etapa atualizada com sucesso para "${newStatus}"`);
      
      // Recarregar dados
      await loadCandidato();
      await loadHistorico();
    } catch (error) {
      console.error("Erro ao atualizar etapa:", error);
      toast.error("Erro ao atualizar etapa do candidato");
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
      <div className="flex min-h-screen items-center justify-center bg-background-light">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!candidato) {
    return (
      <div className="min-h-screen bg-background-light p-8">
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
    <div className="min-h-screen" style={{ backgroundColor: '#00141d' }}>
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
          onEdit={() => navigate(`/candidatos/${id}/editar`)}
          onDelete={() => setDeleteDialogOpen(true)}
          onAddFeedback={() => setFeedbackModalOpen(true)}
          onRelocate={() => setRelocateModalOpen(true)}
          onStatusChange={handleStatusChange}
        />

        {/* Stats Bar */}
        <StatsBar
          criadoEm={candidato.criado_em}
          ultimoFeedback={stats.ultimoFeedback}
          processosParticipados={stats.totalProcessos}
          mediaAvaliacao={stats.mediaRating}
          qtdAvaliacoes={stats.qtdAvaliacoes}
          totalFeedbacks={stats.totalFeedbacks}
        />

        {/* Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <ContactCard
              email={candidato.email}
              telefone={candidato.telefone}
              cidade={candidato.cidade}
              estado={candidato.estado}
              linkedin={candidato.linkedin}
              curriculoLink={candidato.curriculo_link}
            />

            {/* Exibir Dados da Candidatura se o candidato veio de link público */}
            {candidato.source_link_id && (
              <ApplicationDataCard
                nomeCompleto={candidato.nome_completo}
                email={candidato.email}
                telefone={candidato.telefone}
                cidade={candidato.cidade}
                estado={candidato.estado}
                linkedin={candidato.linkedin}
              />
            )}
          </div>

          <div className="space-y-6">
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
              disponibilidadeStatus={candidato.disponibilidade_status}
              pontosFortes={candidato.pontos_fortes}
              pontosDesenvolver={candidato.pontos_desenvolver}
              parecerFinal={candidato.parecer_final}
              origem={candidato.origem}
              candidatoId={id!}
              onUpdate={loadCandidato}
              onVagaClick={() => vaga && navigate(`/vagas/${vaga.id}`)}
            />
          </div>
        </div>

        {/* Feedbacks */}
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button 
              onClick={() => setSolicitarFeedbackModalOpen(true)} 
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            >
              <ExternalLink className="h-5 w-5 mr-2" />
              Solicitar Feedback do Cliente
            </Button>
          </div>
          <FeedbackList
            candidatoId={id!}
            onAddFeedback={() => setFeedbackModalOpen(true)}
          />
        </div>

        {/* History Timeline */}
        <HistoryTimeline
          historico={historico}
          onVagaClick={(vagaId) => navigate(`/vagas/${vagaId}`)}
        />
      </div>

      {/* Modals */}
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

      {/* Solicitar Feedback Modal */}
      <SolicitarFeedbackModal
        open={solicitarFeedbackModalOpen}
        onOpenChange={setSolicitarFeedbackModalOpen}
        candidatoId={id!}
        vagaId={candidato.vaga_relacionada_id}
        candidatoNome={candidato.nome_completo}
      />
    </div>
  );
}
