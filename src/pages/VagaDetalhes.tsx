import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getBusinessDaysFromNow } from "@/lib/dateUtils";
import { JOB_STAGES, getStageIndex, calculateProgress } from "@/lib/jobStages";
import { getEventoIcon, getEventoColor, type TipoEvento, logVagaEvento } from "@/lib/vagaEventos";
import { formatSalaryRange } from "@/lib/salaryUtils";
import { ExternalJobBanner } from "@/components/ExternalJobBanner";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  recrutador: string | null;
  cs_responsavel: string | null;
  complexidade: string | null;
  prioridade: string | null;
  salario_min: number | null;
  salario_max: number | null;
  salario_modalidade: string | null;
  modelo_trabalho: string | null;
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
  const { id } = useParams();
  const navigate = useNavigate();
  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [candidatoContratado, setCandidatoContratado] = useState<Candidato | null>(null);
  const [eventos, setEventos] = useState<VagaEvento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadVaga();
      loadCandidatos();
      loadEventos();

      // Subscribe to real-time updates for this job
      const vagaChannel = supabase
        .channel(`job-${id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'vagas',
            filter: `id=eq.${id}`
          },
          (payload) => {
            setVaga(payload.new as Vaga);
          }
        )
        .subscribe();

      // Subscribe to real-time updates for events
      const eventosChannel = supabase
        .channel(`job-eventos-${id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'vaga_eventos',
            filter: `vaga_id=eq.${id}`
          },
          (payload) => {
            setEventos((prev) => [payload.new as VagaEvento, ...prev]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(vagaChannel);
        supabase.removeChannel(eventosChannel);
      };
    }
  }, [id]);

  const loadEventos = async () => {
    try {
      const { data, error } = await supabase
        .from("vaga_eventos")
        .select("*")
        .eq("vaga_id", id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setEventos((data || []) as VagaEvento[]);
    } catch (error) {
      console.error("Erro ao carregar eventos:", error);
    }
  };

  const loadVaga = async () => {
    try {
      const { data, error } = await supabase
        .from("vagas")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setVaga(data);
    } catch (error) {
      console.error("Erro ao carregar vaga:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCandidatos = async () => {
    try {
      const { data, error } = await supabase
        .from("candidatos")
        .select("id, nome_completo, status, criado_em")
        .eq("vaga_relacionada_id", id)
        .order("criado_em", { ascending: false });

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
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Atualizar status da vaga com os novos campos
      const { error: updateError } = await supabase
        .from("vagas")
        .update({ 
          status: newStage.name as Database['public']['Enums']['status_vaga'], // Manter compatibilidade
          status_slug: newStage.slug,
          status_order: newStage.order,
          status_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

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
        description: `Etapa da vaga atualizada para ${newStage.name} com sucesso.`,
      });

      // Recarregar dados
      loadVaga();
      loadEventos();
    } catch (error) {
      console.error("Erro ao atualizar status da vaga:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a etapa da vaga.",
        variant: "destructive",
      });
    }
  };

  const getTimelineSteps = (currentStatusSlug: string) => {
    const currentStage = JOB_STAGES.find(s => s.slug === currentStatusSlug);
    const currentIndex = currentStage ? currentStage.order - 1 : 0;
    
    return JOB_STAGES.map((stage) => ({
      label: stage.name,
      dates: "",
      status: stage.order - 1 < currentIndex ? "completed" as const : 
              stage.order - 1 === currentIndex ? "current" as const : 
              "pending" as const,
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
        date: format(new Date(candidatoContratado.criado_em), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
      });
    }

    // Usar eventos reais da tabela
    const eventosAtividades = eventos.map((evento) => {
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
        date: format(new Date(evento.created_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
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
      case "offer": return { icon: "celebration", color: "green" };
      case "status_change": return { icon: "add_task", color: "blue" };
      case "candidate_added": return { icon: "person_add", color: "blue" };
      case "process_started": return { icon: "event", color: "gray" };
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!vaga) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark p-8">
        <p className="text-primary-text-light dark:text-primary-text-dark">Vaga não encontrada</p>
      </div>
    );
  }

  const daysOpen = getBusinessDaysFromNow(vaga.criado_em);
  const timelineSteps = getTimelineSteps(vaga.status_slug || 'a_iniciar');
  const activities = getRecentActivities();
  const progress = calculateProgress(vaga.status_slug || 'a_iniciar');

  return (
    <div className="relative flex min-h-screen w-full flex-col font-display bg-background-light dark:bg-background-dark">
      {/* Main Content */}
      <main className="flex-1 px-6 sm:px-10 lg:px-20 py-8">
        <div className="mx-auto max-w-7xl">
          {/* External Job Banner */}
          {vaga.source === "externo" && (
            <div className="mb-6">
              <ExternalJobBanner
                vagaId={vaga.id}
                recrutador={vaga.recrutador}
                csResponsavel={vaga.cs_responsavel}
                complexidade={vaga.complexidade}
                prioridade={vaga.prioridade}
              />
            </div>
          )}

          {/* Title Section */}
          <div className="mb-8">
            <h1 className="text-primary-text-light dark:text-primary-text-dark text-4xl font-black tracking-tight">
              Status da Contratação: {vaga.titulo}
            </h1>
            <p className="text-secondary-text-light dark:text-secondary-text-dark text-base font-normal mt-2">
              Acompanhe o progresso do processo de contratação para a vaga de {vaga.titulo}, {vaga.empresa}.
            </p>
            {(vaga.salario_min || vaga.salario_max || vaga.salario_modalidade) && (
              <p className="text-secondary-text-light dark:text-secondary-text-dark text-sm font-medium mt-1">
                Faixa Salarial: {formatSalaryRange(vaga.salario_min, vaga.salario_max, vaga.salario_modalidade)}
              </p>
            )}
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <div className="flex flex-col gap-3 rounded-lg p-6 bg-white dark:bg-background-dark border border-gray-200 dark:border-secondary-text-light/20 shadow-sm">
              <p className="text-secondary-text-light dark:text-secondary-text-dark text-base font-medium">
                Etapa Atual da Contratação
              </p>
              <Select
                value={vaga.status_slug || 'a_iniciar'}
                onValueChange={handleStatusChange}
                disabled={vaga.status_slug === "concluida"}
              >
                <SelectTrigger className="w-full bg-white dark:bg-background-dark border-border hover:bg-primary/5 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {JOB_STAGES.map((stage) => (
                    <SelectItem 
                      key={stage.id} 
                      value={stage.slug}
                      className="cursor-pointer hover:bg-primary/10"
                    >
                      <span className={vaga.status_slug === stage.slug ? "font-bold" : ""}>
                        {vaga.status_slug === stage.slug && "✅ "}
                        {stage.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {vaga.status_slug === "concluida" && (
                <p className="text-xs text-secondary-text-light dark:text-secondary-text-dark">
                  Etapa bloqueada - vaga concluída
                </p>
              )}
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
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Timeline + Table */}
            <div className="lg:col-span-2">
              {/* Timeline */}
              <h2 className="text-primary-text-light dark:text-primary-text-dark text-2xl font-bold tracking-tight mb-6">
                Linha do Tempo do Processo
              </h2>

              <div className="relative flex flex-col md:flex-row justify-between w-full text-center text-sm font-medium text-secondary-text-light dark:text-secondary-text-dark px-4 mb-12">
                {/* Progress bar background */}
                <div className="absolute top-4 left-0 w-full h-1 bg-gray-200 dark:bg-secondary-text-light/20 rounded-full">
                  <div className="h-1 bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>

                {/* Timeline Steps */}
                {timelineSteps.map((step, index) => (
                  <div key={index} className={`relative flex-1 flex flex-col items-center ${step.status === "pending" ? "opacity-50" : ""}`}>
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all`}
                      style={{
                        backgroundColor: step.status === "pending" ? "#e5e7eb" : step.color.bg,
                        opacity: step.status === "current" ? 1 : step.status === "completed" ? 0.9 : 0.5
                      }}
                    >
                      {step.status === "completed" && (
                        <span className="material-symbols-outlined text-xl" style={{ color: step.color.text }}>check</span>
                      )}
                      {step.status === "current" && (
                        <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: step.color.text }}></div>
                      )}
                    </div>
                    <p 
                      className={`mt-2 text-sm ${step.status === "current" ? "font-bold" : ""}`}
                      style={{ color: step.status === "pending" ? "#9ca3af" : step.color.text }}
                    >
                      {step.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Candidato Contratado Banner */}
              {vaga.status === "Concluído" && candidatoContratado && (
                <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-500 dark:border-green-400 rounded-lg shadow-sm">
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
                </div>
              )}

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
                    {candidatos.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-secondary-text-light dark:text-secondary-text-dark">
                          Nenhum candidato relacionado a esta vaga
                        </td>
                      </tr>
                    ) : (
                      candidatos.map((candidato, index) => (
                        <tr key={candidato.id} className={index < candidatos.length - 1 ? "border-b border-gray-200 dark:border-secondary-text-light/20" : ""}>
                          <td className="p-4 font-medium">{candidato.nome_completo}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(candidato.status)}`}>
                              {candidato.status}
                            </span>
                          </td>
                          <td className="p-4 text-secondary-text-light dark:text-secondary-text-dark">
                            {format(new Date(candidato.criado_em), "d 'de' MMM", { locale: ptBR })}
                          </td>
                          <td className="p-4 text-right">
                            <button 
                              onClick={() => navigate(`/candidatos/${candidato.id}`)}
                              className="text-primary font-bold text-sm hover:brightness-95 transition-all"
                            >
                              Visualizar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
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
                {activities.map((activity) => {
                  const { icon, color } = getActivityIcon(activity.type);
                  const bgColorClass = 
                    color === "green" ? "bg-green-500/20" :
                    color === "blue" ? "bg-blue-500/20" :
                    "bg-gray-500/20";
                  const textColorClass = 
                    color === "green" ? "text-green-600 dark:text-green-400" :
                    color === "blue" ? "text-blue-600 dark:text-blue-400" :
                    "text-gray-600 dark:text-gray-400";

                  return (
                    <div key={activity.id} className="flex items-start gap-4">
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
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
