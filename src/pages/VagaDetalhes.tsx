import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getBusinessDaysFromNow } from "@/lib/dateUtils";
import { JOB_STAGES, getStageIndex, calculateProgress } from "@/lib/jobStages";
import { getEventoIcon, getEventoColor, type TipoEvento, logVagaEvento } from "@/lib/vagaEventos";
import { formatSalaryRange } from "@/lib/salaryUtils";
import { ExternalJobBanner } from "@/components/ExternalJobBanner";
import { ShareJobModal } from "@/components/ShareJobModal";
import { AnalyzeScorecards } from "@/components/FunilVagas/AnalyzeScorecards";
import { TagPicker } from "@/components/TagPicker";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";
type VagaEvento = {
  id: string;
  tipo: TipoEvento;
  descricao: string;
  created_at: string;
  payload: any;
};
type Vaga = {
  id: string;
  titulo: string;
  empresa: string;
  status: string; // Legado - ainda usado para exibição
  status_slug: string; // Novo campo padronizado
  status_order: number; // Ordem no funil
  criado_em: string;
  confidencial: boolean | null;
  motivo_confidencial: string | null;
  contato_nome: string | null;
  contato_email: string | null;
  contato_telefone: string | null;
  recrutador: string | null;
  cs_responsavel: string | null;
  complexidade: string | null;
  prioridade: string | null;
  salario_min: number | null;
  salario_max: number | null;
  salario_modalidade: string | null;
  modelo_trabalho: string | null;
  tipo_contratacao: string | null;
  horario_inicio: string | null;
  horario_fim: string | null;
  dias_semana: string[] | null;
  beneficios: string[] | null;
  beneficios_outros: string | null;
  requisitos_obrigatorios: string | null;
  requisitos_desejaveis: string | null;
  responsabilidades: string | null;
  observacoes: string | null;
  source: string | null;
};
type Candidato = {
  id: string;
  nome_completo: string;
  status: string;
  criado_em: string;
};
type Activity = {
  id: string;
  type: "offer" | "status_change" | "candidate_added" | "process_started";
  description: string;
  date: string;
};
export default function VagaDetalhes() {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [candidatoContratado, setCandidatoContratado] = useState<Candidato | null>(null);
  const [eventos, setEventos] = useState<VagaEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [savingTags, setSavingTags] = useState(false);
  const [vagaTags, setVagaTags] = useState<Array<{
    id: string;
    label: string;
    category: string;
  }>>([]);
  useEffect(() => {
    if (id) {
      loadVaga();
      loadCandidatos();
      loadEventos();

      // Subscribe to real-time updates for this job
      const vagaChannel = supabase.channel(`job-${id}`).on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'vagas',
        filter: `id=eq.${id}`
      }, payload => {
        setVaga(payload.new as Vaga);
      }).subscribe();

      // Subscribe to real-time updates for events
      const eventosChannel = supabase.channel(`job-eventos-${id}`).on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'vaga_eventos',
        filter: `vaga_id=eq.${id}`
      }, payload => {
        setEventos(prev => [payload.new as VagaEvento, ...prev]);
      }).subscribe();
      return () => {
        supabase.removeChannel(vagaChannel);
        supabase.removeChannel(eventosChannel);
      };
    }
  }, [id]);
  const loadEventos = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("vaga_eventos").select("*").eq("vaga_id", id).order("created_at", {
        ascending: false
      }).limit(20);
      if (error) throw error;
      setEventos((data || []) as VagaEvento[]);
    } catch (error) {
      console.error("Erro ao carregar eventos:", error);
    }
  };
  const loadTags = async () => {
    try {
      const {
        data: vacancyTagsData,
        error: vacancyTagsError
      } = await (supabase as any).from("vacancy_tags").select("tag_id").eq("vacancy_id", id!);
      if (vacancyTagsError) throw vacancyTagsError;
      if (vacancyTagsData && vacancyTagsData.length > 0) {
        const tagIds = vacancyTagsData.map((vt: any) => vt.tag_id);
        setSelectedTags(tagIds);

        // Carregar dados completos das tags
        const {
          data: tagsData,
          error: tagsError
        } = await (supabase as any).from("tags").select("id, label, category").in("id", tagIds);
        if (tagsError) throw tagsError;
        if (tagsData) {
          setVagaTags(tagsData);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
    }
  };
  const saveTags = async () => {
    if (!id) return;
    setSavingTags(true);
    try {
      // Remover todas as tags existentes
      await (supabase as any).from("vacancy_tags").delete().eq("vacancy_id", id);

      // Inserir novas tags
      if (selectedTags.length > 0) {
        const tagsToInsert = selectedTags.map(tagId => ({
          vacancy_id: id,
          tag_id: tagId
        }));
        const {
          error
        } = await (supabase as any).from("vacancy_tags").insert(tagsToInsert);
        if (error) throw error;
      }

      // Recarregar tags após salvar
      await loadTags();
      toast({
        title: "Tags atualizadas",
        description: "As tags da vaga foram atualizadas com sucesso."
      });
    } catch (error) {
      console.error("Erro ao salvar tags:", error);
      toast({
        title: "Erro ao salvar tags",
        description: "Não foi possível atualizar as tags da vaga.",
        variant: "destructive"
      });
    } finally {
      setSavingTags(false);
    }
  };
  const loadVaga = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("vagas").select(`
          *,
          recrutador_user:users!vagas_recrutador_id_fkey(name),
          cs_user:users!vagas_cs_id_fkey(name)
        `).eq("id", id).is("deleted_at", null).single();
      if (error) throw error;

      // Se a vaga foi deletada, redirecionar para lista
      if (data.deleted_at) {
        toast({
          title: "Vaga excluída",
          description: "Esta vaga foi excluída e não está mais disponível.",
          variant: "destructive"
        });
        navigate("/vagas");
        return;
      }

      // Mesclar nome do recrutador e CS do JOIN
      setVaga({
        ...data,
        recrutador: data.recrutador_user?.name || data.recrutador || null,
        cs_responsavel: data.cs_user?.name || data.cs_responsavel || null,
        tipo_contratacao: (data as any).tipo_contratacao || null
      });
    } catch (error) {
      console.error("Erro ao carregar vaga:", error);
    } finally {
      setLoading(false);
    }
  };
  const loadCandidatos = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("candidatos").select("id, nome_completo, status, criado_em").eq("vaga_relacionada_id", id).order("criado_em", {
        ascending: false
      });
      if (error) throw error;
      setCandidatos(data || []);

      // Buscar candidato contratado
      const contratado = (data || []).find(c => c.status === "Contratado");
      setCandidatoContratado(contratado || null);
    } catch (error) {
      console.error("Erro ao carregar candidatos:", error);
    }
  };
  const handleStatusChange = async (newStatusSlug: string) => {
    if (!id || !vaga) return;

    // Buscar stage pelo slug
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

      // Atualizar status da vaga usando apenas slug e order
      const {
        error: updateError
      } = await supabase.from("vagas").update({
        status_slug: newStage.slug,
        status_order: newStage.order,
        status_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq("id", id);
      if (updateError) throw updateError;

      // Registrar evento
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

      // Atualizar estado local
      setVaga({
        ...vaga,
        status: newStage.name,
        status_slug: newStage.slug,
        status_order: newStage.order
      });

      // Mostrar toast de sucesso
      toast({
        title: "Etapa atualizada",
        description: `Etapa da vaga atualizada para ${newStage.name} com sucesso.`
      });

      // Recarregar dados
      loadVaga();
      loadEventos();

      // Scroll para etapa atual após pequeno delay
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
  const getTimelineSteps = (currentStatusSlug: string) => {
    const currentStage = JOB_STAGES.find(s => s.slug === currentStatusSlug);
    const currentIndex = currentStage ? currentStage.order - 1 : 0;
    return JOB_STAGES.map(stage => ({
      label: stage.name,
      dates: "",
      status: stage.order - 1 < currentIndex ? "completed" as const : stage.order - 1 === currentIndex ? "current" as const : "pending" as const,
      color: stage.color
    }));
  };
  const getRecentActivities = (): Activity[] => {
    const activities: Activity[] = [];

    // Adicionar candidato contratado no topo se existir
    if (candidatoContratado && vaga?.status === "Concluído") {
      activities.push({
        id: `contratado-${candidatoContratado.id}`,
        type: "offer",
        description: `Candidato "${candidatoContratado.nome_completo}" foi contratado para esta vaga`,
        date: format(new Date(candidatoContratado.criado_em), "d 'de' MMMM 'de' yyyy 'às' HH:mm", {
          locale: ptBR
        })
      });
    }

    // Usar eventos reais da tabela
    const eventosAtividades = eventos.map(evento => {
      // Mapear tipos de eventos para os tipos esperados pelo ActivityLog
      let type: Activity["type"] = "process_started";
      if (evento.tipo === "CANDIDATO_ADICIONADO") {
        type = "candidate_added";
      } else if (evento.tipo === "CANDIDATO_MOVIDO") {
        type = "status_change";
      } else if (evento.tipo === "ETAPA_ALTERADA") {
        type = "status_change";
      } else if (evento.tipo === "FEEDBACK_ADICIONADO") {
        type = "status_change";
      }
      return {
        id: evento.id,
        type,
        description: evento.descricao,
        date: format(new Date(evento.created_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", {
          locale: ptBR
        })
      };
    });
    return [...activities, ...eventosAtividades];
  };
  const getStatusBadgeClass = (status: string) => {
    if (status === "Oferta Enviada") return "bg-green-500/20 text-green-800 dark:text-green-300";
    if (status === "1ª Entrevista") return "bg-blue-500/20 text-blue-800 dark:text-blue-300";
    return "bg-primary/20 text-primary-text-light dark:text-primary-text-dark";
  };
  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "offer":
        return {
          icon: "celebration",
          color: "green"
        };
      case "status_change":
        return {
          icon: "add_task",
          color: "blue"
        };
      case "candidate_added":
        return {
          icon: "person_add",
          color: "blue"
        };
      case "process_started":
        return {
          icon: "event",
          color: "gray"
        };
    }
  };
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>;
  }
  if (!vaga) {
    return <div className="min-h-screen bg-background-light dark:bg-background-dark p-8">
        <p className="text-primary-text-light dark:text-primary-text-dark">Vaga não encontrada</p>
      </div>;
  }
  const daysOpen = getBusinessDaysFromNow(vaga.criado_em);
  const timelineSteps = getTimelineSteps(vaga.status_slug || 'a_iniciar');
  const activities = getRecentActivities();
  const progress = calculateProgress(vaga.status_slug || 'a_iniciar');
  return <div className="relative flex min-h-screen w-full flex-col font-display bg-background-light dark:bg-background-dark">
      {/* Main Content */}
      <main className="flex-1 px-6 sm:px-10 lg:px-20 py-8">
        <div className="mx-auto max-w-7xl">
          {/* External Job Banner */}
          {vaga.source === "externo" && <div className="mb-6">
              <ExternalJobBanner vagaId={vaga.id} recrutador={vaga.recrutador} csResponsavel={vaga.cs_responsavel} complexidade={vaga.complexidade} prioridade={vaga.prioridade} />
            </div>}

          {/* Title Section */}
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-primary-text-light dark:text-primary-text-dark text-4xl font-black tracking-tight">
                {vaga.titulo}
              </h1>
            <p className="text-secondary-text-light dark:text-secondary-text-dark text-base font-normal mt-2">
              {vaga.empresa} • Acompanhe o progresso do processo de contratação
            </p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {(vaga.salario_min || vaga.salario_max || vaga.salario_modalidade) && <p className="text-secondary-text-light dark:text-secondary-text-dark text-lg font-semibold">
                    💰 {formatSalaryRange(vaga.salario_min, vaga.salario_max, vaga.salario_modalidade)}
                  </p>}
                {vagaTags.length > 0 && <div className="flex flex-wrap gap-2">
                    {vagaTags.map(tag => {
                  const categoryColors: Record<string, string> = {
                    area: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700",
                    role: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700",
                    skill: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600",
                    seniority: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700",
                    location: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700"
                  };
                  return <Badge key={tag.id} variant="outline" className={categoryColors[tag.category] || "bg-gray-100 text-gray-800 border-gray-300"}>
                          {tag.label}
                        </Badge>;
                })}
                  </div>}
              </div>
            </div>
            <div className="flex gap-2">
              <AnalyzeScorecards vagaId={vaga.id} vagaTitulo={vaga.titulo} />
              <button onClick={() => setDetailsDrawerOpen(true)} className="px-4 py-2 dark:bg-background-dark border-2 border-primary text-primary-text-light dark:text-primary-text-dark transition-colors flex items-center gap-2 font-bold bg-[faec3e] rounded-sm text-[faec3e] text-slate-950 bg-[#faec3e]">
                <span className="material-symbols-outlined text-xl">info</span>
                Ver Detalhes
              </button>
              <button onClick={() => setShareModalOpen(true)} className="px-4 py-2 text-primary-foreground rounded-md transition-colors flex items-center gap-2 font-bold bg-[#faec3e]">
                <span className="material-symbols-outlined text-xl">share</span>
                Compartilhar
              </button>
            </div>
          </div>

          <ShareJobModal open={shareModalOpen} onOpenChange={setShareModalOpen} vagaId={vaga.id} vagaTitulo={vaga.titulo} />

          {/* Drawer de Detalhes da Vaga */}
          <Sheet open={detailsDrawerOpen} onOpenChange={setDetailsDrawerOpen}>
            <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
              <SheetHeader className="mb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="text-2xl font-bold">Detalhes da Vaga</SheetTitle>
                    <SheetDescription>
                      Informações completas sobre a vaga
                    </SheetDescription>
                  </div>
                  <button onClick={() => {
                  setDetailsDrawerOpen(false);
                  navigate(`/vagas/${vaga.id}/editar`);
                }} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2 font-bold">
                    <span className="material-symbols-outlined text-xl">edit</span>
                    Editar Vaga
                  </button>
                </div>
              </SheetHeader>

              <div className="space-y-6">
                {/* Informações Gerais */}
                <div className="bg-muted/30 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4">📋 Informações Gerais</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Título da Vaga</p>
                      <p className="text-lg font-semibold">{vaga.titulo}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Empresa</p>
                      <p className="text-base">
                        {vaga.confidencial ? "🔒 Confidencial" : vaga.empresa}
                      </p>
                      {vaga.confidencial && vaga.motivo_confidencial && <p className="text-sm text-muted-foreground mt-1">{vaga.motivo_confidencial}</p>}
                    </div>

                    {vaga.recrutador && <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Recrutador Responsável</p>
                        <p className="text-base">👤 {vaga.recrutador}</p>
                      </div>}

                    {vaga.cs_responsavel && <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">CS Responsável</p>
                        <p className="text-base">👥 {vaga.cs_responsavel}</p>
                      </div>}

                    {vaga.contato_nome && <div className="pt-4 border-t space-y-3">
                        <h4 className="text-base font-semibold">📞 Contato do Solicitante</h4>
                        
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Nome</p>
                          <p className="text-base">{vaga.contato_nome}</p>
                        </div>
                        
                        {vaga.contato_email && <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">E-mail</p>
                            <p className="text-base">
                              <a href={`mailto:${vaga.contato_email}`} className="text-primary hover:underline">
                                {vaga.contato_email}
                              </a>
                            </p>
                          </div>}
                        
                        {vaga.contato_telefone && <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Telefone</p>
                            <p className="text-base">
                              <a href={`tel:${vaga.contato_telefone}`} className="text-primary hover:underline">
                                {vaga.contato_telefone}
                              </a>
                            </p>
                          </div>}
                      </div>}

                    <div className="grid grid-cols-2 gap-4">
                      {vaga.complexidade && <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Complexidade</p>
                          <p className="text-base">⚙️ {vaga.complexidade}</p>
                        </div>}

                      {vaga.prioridade && <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Prioridade</p>
                          <p className="text-base">🔥 {vaga.prioridade}</p>
                        </div>}
                    </div>

                    {vaga.modelo_trabalho && <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Modelo de Trabalho</p>
                        <p className="text-base">🏢 {vaga.modelo_trabalho}</p>
                      </div>}

                    {(vaga.horario_inicio || vaga.horario_fim) && <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Horário de Trabalho</p>
                        <p className="text-base">
                          🕐 {vaga.horario_inicio || "?"} às {vaga.horario_fim || "?"}
                        </p>
                        {vaga.dias_semana && vaga.dias_semana.length > 0 && <p className="text-sm text-muted-foreground mt-1">
                            {vaga.dias_semana.join(", ")}
                          </p>}
                      </div>}
                  </div>
                </div>

                {/* Responsabilidades */}
                {vaga.responsabilidades && <div className="bg-muted/30 rounded-lg p-6">
                    <h3 className="text-xl font-bold mb-4">📋 Responsabilidades</h3>
                    <div className="text-base whitespace-pre-wrap">{vaga.responsabilidades}</div>
                  </div>}

                {/* Requisitos Obrigatórios */}
                {vaga.requisitos_obrigatorios && <div className="bg-muted/30 rounded-lg p-6">
                    <h3 className="text-xl font-bold mb-4">✅ Requisitos Obrigatórios</h3>
                    <div className="text-base whitespace-pre-wrap">{vaga.requisitos_obrigatorios}</div>
                  </div>}

                {/* Requisitos Desejáveis */}
                {vaga.requisitos_desejaveis && <div className="bg-muted/30 rounded-lg p-6">
                    <h3 className="text-xl font-bold mb-4">⭐ Requisitos Desejáveis</h3>
                    <div className="text-base whitespace-pre-wrap">{vaga.requisitos_desejaveis}</div>
                  </div>}

                {/* Benefícios */}
                {vaga.beneficios && vaga.beneficios.length > 0 && <div className="bg-muted/30 rounded-lg p-6">
                    <h3 className="text-xl font-bold mb-4">🎁 Benefícios</h3>
                    <div className="flex flex-wrap gap-2">
                      {vaga.beneficios.map((beneficio, index) => <span key={index} className="px-3 py-1 bg-primary/10 text-primary-text-light dark:text-primary-text-dark rounded-full text-sm font-medium">
                          {beneficio}
                        </span>)}
                    </div>
                    {vaga.beneficios_outros && <p className="text-base mt-4">{vaga.beneficios_outros}</p>}
                  </div>}

                {/* Observações */}
                {vaga.observacoes && <div className="bg-muted/30 rounded-lg p-6">
                    <h3 className="text-xl font-bold mb-4">📝 Observações</h3>
                    <div className="text-base whitespace-pre-wrap">{vaga.observacoes}</div>
                  </div>}

                {/* Tags */}
                <div className="bg-muted/30 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4">🏷️ Tags</h3>
                  <TagPicker selectedTags={selectedTags} onChange={setSelectedTags} />
                  <div className="mt-4 flex justify-end">
                    <button onClick={saveTags} disabled={savingTags} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium">
                      {savingTags ? "Salvando..." : "Salvar Tags"}
                    </button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="flex flex-col gap-3 rounded-lg p-6 bg-white dark:bg-background-dark border border-gray-200 dark:border-secondary-text-light/20 shadow-sm">
              <p className="text-secondary-text-light dark:text-secondary-text-dark text-base font-medium">
                Etapa Atual da Contratação
              </p>
              <Select value={vaga.status_slug || 'a_iniciar'} onValueChange={handleStatusChange} disabled={vaga.status_slug === "concluida"}>
                <SelectTrigger className="w-full bg-white dark:bg-background-dark border-border hover:bg-primary/5 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {JOB_STAGES.map(stage => <SelectItem key={stage.id} value={stage.slug} className="cursor-pointer hover:bg-primary/10">
                      <span className={vaga.status_slug === stage.slug ? "font-bold" : ""}>
                        {vaga.status_slug === stage.slug && "✅ "}
                        {stage.name}
                      </span>
                    </SelectItem>)}
                </SelectContent>
              </Select>
              {vaga.status_slug === "concluida" && <p className="text-xs text-secondary-text-light dark:text-secondary-text-dark">
                  Etapa bloqueada - vaga concluída
                </p>}
            </div>

            <div className="flex flex-col gap-2 rounded-lg p-6 bg-white dark:bg-background-dark border border-gray-200 dark:border-secondary-text-light/20 shadow-sm">
              <p className="text-secondary-text-light dark:text-secondary-text-dark text-base font-medium">
                Candidatos Ativos
              </p>
              <p className="text-primary-text-light dark:text-primary-text-dark text-3xl font-bold">
                {candidatos.length}
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-lg p-6 bg-white dark:bg-background-dark border border-gray-200 dark:border-secondary-text-light/20 shadow-sm">
              <p className="text-secondary-text-light dark:text-secondary-text-dark text-base font-medium">
                Duração do Processo
              </p>
              <p className="text-primary-text-light dark:text-primary-text-dark text-3xl font-bold">
                {daysOpen} Dias
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-lg p-6 bg-white dark:bg-background-dark border border-gray-200 dark:border-secondary-text-light/20 shadow-sm">
              <p className="text-secondary-text-light dark:text-secondary-text-dark text-base font-medium">
                Modelo de Trabalho
              </p>
              <p className="text-primary-text-light dark:text-primary-text-dark text-2xl font-bold">
                {vaga.modelo_trabalho || "Não informado"}
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-lg p-6 bg-white dark:bg-background-dark border border-gray-200 dark:border-secondary-text-light/20 shadow-sm">
              <p className="text-secondary-text-light dark:text-secondary-text-dark text-base font-medium">
                Formato da Contratação
              </p>
              <p className="text-primary-text-light dark:text-primary-text-dark text-2xl font-bold">
                {vaga.tipo_contratacao || "Não informado"}
              </p>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Timeline + Table */}
            <div className="lg:col-span-2">
              {/* Timeline */}
              <h2 className="text-primary-text-light dark:text-primary-text-dark text-2xl font-bold tracking-tight mb-6">
                Linha do Tempo do Processo
              </h2>

              <div className="mb-12">
                <TooltipProvider>
                  <ScrollArea className="w-full">
                    <div className="relative min-w-max pb-2">
                      <div className="flex items-center gap-8 px-4">
                        {/* Timeline Steps */}
                        {timelineSteps.map((step, index) => <Tooltip key={index}>
                            <TooltipTrigger asChild>
                              <div id={step.status === "current" ? "current-step" : undefined} className="relative flex flex-col items-center min-w-[140px]" style={{
                            opacity: step.status === "pending" ? 0.5 : 1
                          }}>
                                {/* Connector Line */}
                                {index < timelineSteps.length - 1 && <div className="absolute left-1/2 top-[20px] h-[2px] w-[calc(100%+32px)] -translate-y-1/2" style={{
                              backgroundColor: step.status === "completed" ? "#F9EC3F" : "#E5E7EB",
                              zIndex: 0
                            }} />}
                                
                                {/* Step Circle */}
                                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full transition-all mb-3" style={{
                              backgroundColor: step.status === "pending" ? "#D1D5DB" : step.status === "current" ? "#ffffff" : "#F9EC3F",
                              border: step.status === "current" ? "3px solid #F9EC3F" : "none"
                            }}>
                                  {step.status === "completed" && <span className="material-symbols-outlined text-xl" style={{
                                color: "#00141D"
                              }}>check</span>}
                                  {step.status === "current" && <div className="h-4 w-4 rounded-full animate-pulse" style={{
                                backgroundColor: "#F9EC3F"
                              }}></div>}
                                </div>
                                
                                {/* Step Label */}
                                <p className={`text-center text-xs font-semibold whitespace-nowrap ${step.status === "current" ? "text-[#00141D]" : step.status === "pending" ? "text-[#9CA3AF]" : "text-[#00141D]"}`}>
                                  {step.label}
                                </p>
                                
                                {step.status === "current" && <p className="text-[10px] text-[#F9EC3F] mt-1 font-medium">Em Progresso</p>}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{step.label}</p>
                            </TooltipContent>
                          </Tooltip>)}
                      </div>
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </TooltipProvider>
                
                {/* Progress Indicator */}
                <div className="mt-4 px-4">
                  <div className="flex items-center justify-between text-xs text-secondary-text-light dark:text-secondary-text-dark mb-1">
                    <span>Progresso</span>
                    <span className="font-semibold">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" indicatorClassName="bg-[#F9EC3F]" />
                </div>
              </div>

              {/* Candidato Contratado Banner */}
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
                        Candidato contratado: <span className="font-semibold">{candidatoContratado.nome_completo}</span>
                      </p>
                    </div>
                  </div>
                </div>}

              {/* Active Candidates Table */}
              <h2 className="text-primary-text-light dark:text-primary-text-dark text-2xl font-bold tracking-tight mt-12 mb-6">
                Candidatos Ativos
              </h2>

              <div className="overflow-x-auto bg-white dark:bg-background-dark border border-gray-200 dark:border-secondary-text-light/20 rounded-lg shadow-sm">
                <table className="w-full text-left">
                  <thead className="border-b border-gray-200 dark:border-secondary-text-light/20 text-sm text-secondary-text-light dark:text-secondary-text-dark">
                    <tr>
                      <th className="p-4 font-medium">Nome do Candidato</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Última Atualização</th>
                      <th className="p-4 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="text-primary-text-light dark:text-primary-text-dark text-sm">
                    {candidatos.length === 0 ? <tr>
                        <td colSpan={4} className="p-8 text-center text-secondary-text-light dark:text-secondary-text-dark">
                          Nenhum candidato relacionado a esta vaga
                        </td>
                      </tr> : candidatos.map((candidato, index) => <tr key={candidato.id} className={index < candidatos.length - 1 ? "border-b border-gray-200 dark:border-secondary-text-light/20" : ""}>
                          <td className="p-4 font-medium">{candidato.nome_completo}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(candidato.status)}`}>
                              {candidato.status}
                            </span>
                          </td>
                          <td className="p-4 text-secondary-text-light dark:text-secondary-text-dark">
                            {format(new Date(candidato.criado_em), "d 'de' MMM", {
                        locale: ptBR
                      })}
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={() => navigate(`/candidatos/${candidato.id}`)} className="text-primary font-bold text-sm hover:brightness-95 transition-all">
                              Visualizar
                            </button>
                          </td>
                        </tr>)}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: Activity Log */}
            <div className="lg:col-span-1">
              <h2 className="text-primary-text-light dark:text-primary-text-dark text-2xl font-bold tracking-tight mb-6">
                Atividade Recente
              </h2>

              <div className="space-y-6">
                {activities.map(activity => {
                const {
                  icon,
                  color
                } = getActivityIcon(activity.type);
                const bgColorClass = color === "green" ? "bg-green-500/20" : color === "blue" ? "bg-blue-500/20" : "bg-gray-500/20";
                const textColorClass = color === "green" ? "text-green-600 dark:text-green-400" : color === "blue" ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400";
                return <div key={activity.id} className="flex items-start gap-4">
                      <div className={`flex-shrink-0 mt-1 size-8 rounded-full ${bgColorClass} flex items-center justify-center`}>
                        <span className={`material-symbols-outlined ${textColorClass} text-lg`}>
                          {icon}
                        </span>
                      </div>
                      <div>
                        <p className="text-primary-text-light dark:text-primary-text-dark font-medium text-sm">
                          {activity.description}
                        </p>
                        <p className="text-secondary-text-light dark:text-secondary-text-dark text-xs">
                          {activity.date}
                        </p>
                      </div>
                    </div>;
              })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>;
}