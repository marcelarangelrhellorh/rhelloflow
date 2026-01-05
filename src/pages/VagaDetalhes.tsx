import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessDaysFromNow } from "@/lib/dateUtils";
import { JOB_STAGES, calculateProgress } from "@/lib/jobStages";
import { logVagaEvento } from "@/lib/vagaEventos";
import { ExternalJobBanner } from "@/components/ExternalJobBanner";
import { ShareJobModal } from "@/components/ShareJobModal";
import { ClientViewLinkManager } from "@/components/ClientViewLinkManager";
import { VagaHeader } from "@/components/VagaDetalhes/VagaHeader";
import { VagaKPICards } from "@/components/VagaDetalhes/VagaKPICards";
import { VagaTimeline } from "@/components/VagaDetalhes/VagaTimeline";
import { VagaCandidatesTable } from "@/components/VagaDetalhes/VagaCandidatesTable";
import { VagaActivityLog } from "@/components/VagaDetalhes/VagaActivityLog";
import { VagaDetailsDrawer } from "@/components/VagaDetalhes/VagaDetailsDrawer";
import { VagaTasksCard } from "@/components/VagaDetalhes/VagaTasksCard";
import { VagaMeetingsCard } from "@/components/VagaDetalhes/VagaMeetingsCard";
import { JobHistorySection } from "@/components/VagaDetalhes/JobHistorySection";
import { toast } from "@/hooks/use-toast";

// Custom hooks with React Query
import { useVaga } from "@/hooks/data/useVagaQuery";
import { useCandidatos } from "@/hooks/data/useCandidatosQuery";
import { useVagaEventos } from "@/hooks/data/useVagaEventosQuery";
import { useVagaTags } from "@/hooks/data/useVagaTagsQuery";
export default function VagaDetalhes() {
  const {
    id
  } = useParams();

  // Custom hooks - centralized data management
  const {
    vaga,
    loading,
    reload: reloadVaga,
    updateVaga
  } = useVaga(id);
  const {
    candidatos,
    candidatoContratado
  } = useCandidatos(id);
  const {
    eventos,
    reload: reloadEventos
  } = useVagaEventos(id);
  const {
    selectedTags,
    setSelectedTags,
    vagaTags,
    saving: savingTags,
    saveTags
  } = useVagaTags(id);

  // Local UI state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [clientViewManagerOpen, setClientViewManagerOpen] = useState(false);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const handleGenerateClientLink = () => {
    setClientViewManagerOpen(true);
  };
  const handleStatusChange = async (newStatusSlug: string) => {
    if (!id || !vaga) return;
    const newStage = JOB_STAGES.find(s => s.slug === newStatusSlug);
    if (!newStage) {
      toast({
        title: "Erro",
        description: "Status inválido selecionado.",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      const {
        error: updateError
      } = await supabase.from("vagas").update({
        status_slug: newStage.slug,
        status_order: newStage.order,
        status_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq("id", id);
      if (updateError) throw updateError;
      await logVagaEvento({
        vagaId: id,
        actorUserId: user?.id || null,
        tipo: "ETAPA_ALTERADA",
        descricao: `Etapa da vaga alterada de "${vaga.status}" para "${newStage.name}"`,
        payload: {
          status_anterior: vaga.status,
          status_anterior_slug: vaga.status_slug,
          status_novo: newStage.name,
          status_novo_slug: newStage.slug
        }
      });
      updateVaga({
        status: newStage.name,
        status_slug: newStage.slug,
        status_order: newStage.order
      });
      toast({
        title: "Etapa atualizada",
        description: `Etapa da vaga atualizada para ${newStage.name} com sucesso.`
      });
      reloadVaga();
      reloadEventos();
      setTimeout(() => {
        const currentStepElement = document.getElementById("current-step");
        if (currentStepElement) {
          currentStepElement.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center"
          });
        }
      }, 300);
    } catch (error) {
      console.error("Erro ao atualizar status da vaga:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a etapa da vaga.",
        variant: "destructive"
      });
    }
  };
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>;
  }
  if (!vaga) {
    return <div className="min-h-screen bg-background-light dark:bg-background-dark p-8">
        <p className="text-primary-text-light dark:text-primary-text-dark">
          Vaga não encontrada
        </p>
      </div>;
  }
  const daysOpen = getBusinessDaysFromNow(vaga.criado_em);
  const progress = calculateProgress(vaga.status_slug || "a_iniciar");
  return <div className="relative flex min-h-screen w-full font-display bg-white dark:bg-background-dark">
      {/* Main Content */}
      <main className="flex-1 px-6 sm:px-10 lg:px-16 py-8">
        <div className="w-full mx-0 py-0 px-0">
          {/* External Job Banner */}
          {vaga.source === "externo" && <div className="mb-6">
              <ExternalJobBanner vagaId={vaga.id} recrutador={vaga.recrutador} csResponsavel={vaga.cs_responsavel} complexidade={vaga.complexidade} prioridade={vaga.prioridade} />
            </div>}

          <VagaHeader vaga={vaga} vagaTags={vagaTags} onGenerateClientLink={handleGenerateClientLink} onViewDetails={() => setDetailsDrawerOpen(true)} onShare={() => setShareModalOpen(true)} />

          <ShareJobModal open={shareModalOpen} onOpenChange={setShareModalOpen} vagaId={vaga.id} vagaTitulo={vaga.titulo} />

          <ClientViewLinkManager vagaId={vaga.id} open={clientViewManagerOpen} onOpenChange={setClientViewManagerOpen} />

          <VagaDetailsDrawer open={detailsDrawerOpen} onOpenChange={setDetailsDrawerOpen} vaga={vaga} selectedTags={selectedTags} onTagsChange={setSelectedTags} onSaveTags={saveTags} savingTags={savingTags} />

          <VagaKPICards vaga={vaga} candidatos={candidatos} daysOpen={daysOpen} onStatusChange={handleStatusChange} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <VagaTimeline currentStatusSlug={vaga.status_slug || "a_iniciar"} progress={progress} />

              <JobHistorySection vagaId={vaga.id} />

              {vaga.status === "Concluído" && candidatoContratado && <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-500 dark:border-green-400 rounded-lg shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-3xl">
                      celebration
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-green-800 dark:text-green-300">
                        Vaga Concluída com Sucesso!
                      </h3>
                      <p className="text-green-700 dark:text-green-400 text-sm mt-1">
                        Candidato contratado:{" "}
                        <span className="font-semibold">{candidatoContratado.nome_completo}</span>
                      </p>
                    </div>
                  </div>
                </div>}

              <VagaCandidatesTable candidatos={candidatos} vagaId={vaga.id} vagaTitulo={vaga.titulo} />
            </div>

            <div className="lg:col-span-1 space-y-6 shadow-lg border-[#ffcc00] border-solid border-2">
              <VagaActivityLog eventos={eventos} candidatoContratado={candidatoContratado} vagaStatus={vaga.status} />
            </div>
          </div>
        </div>
      </main>

      {/* Right Sidebar - Tasks & Meetings */}
      <aside className="hidden xl:flex w-96 flex-shrink-0 flex-col gap-6 border-l border-border bg-white dark:bg-background-dark p-4 sticky top-0 h-screen overflow-y-auto">
        <VagaTasksCard vagaId={vaga.id} vagaTitulo={vaga.titulo} />
        <VagaMeetingsCard vagaId={vaga.id} vagaTitulo={vaga.titulo} />
      </aside>
    </div>;
}