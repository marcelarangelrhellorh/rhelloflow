import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getBusinessDaysFromNow } from "@/lib/dateUtils";

type Vaga = {
  id: string;
  titulo: string;
  empresa: string;
  status: string;
  criado_em: string;
  confidencial: boolean | null;
  motivo_confidencial: string | null;
  recrutador: string | null;
  cs_responsavel: string | null;
  complexidade: string | null;
  prioridade: string | null;
  salario_min: number | null;
  salario_max: number | null;
  modelo_trabalho: string | null;
  horario_inicio: string | null;
  horario_fim: string | null;
  dias_semana: string[] | null;
  beneficios: string[] | null;
  requisitos_obrigatorios: string | null;
  requisitos_desejaveis: string | null;
  responsabilidades: string | null;
  observacoes: string | null;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadVaga();
      loadCandidatos();
    }
  }, [id]);

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
    } catch (error) {
      console.error("Erro ao carregar candidatos:", error);
    }
  };

  const getTimelineSteps = (currentStatus: string, criadoEm: string) => {
    const statusOrder = [
      { label: "Busca", dates: "1-10 Out" },
      { label: "Triagem", dates: "11-15 Out" },
      { label: "1ª Entrevista", dates: "16-22 Out" },
      { label: "Entrevista Final", dates: "Em Progresso" },
      { label: "Oferta", dates: "" },
      { label: "Contratado", dates: "" }
    ];
    
    const statusMap: Record<string, number> = {
      "A iniciar": 0,
      "Discovery": 1,
      "Triagem": 1,
      "Entrevistas Rhello": 2,
      "Apresentação de Candidatos": 3,
      "Entrevista cliente": 3,
      "Oferta Enviada": 4,
      "Contratado": 5
    };
    
    const currentIndex = statusMap[currentStatus] ?? 0;
    
    return statusOrder.map((step, index) => ({
      ...step,
      status: index < currentIndex ? "completed" : 
              index === currentIndex ? "current" : 
              "pending"
    }));
  };

  const getRecentActivities = (): Activity[] => {
    const activities: Activity[] = [];

    if (vaga) {
      activities.push({
        id: "1",
        type: "process_started",
        description: `Processo de contratação para ${vaga.titulo} iniciado`,
        date: format(new Date(vaga.criado_em), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
      });
    }

    candidatos.slice(0, 3).forEach((candidato, index) => {
      const activityType = index === 0 ? "status_change" : 
                          index === 1 && candidato.status === "Oferta Enviada" ? "offer" : 
                          "candidate_added";
      
      const description = activityType === "status_change" 
        ? `${candidato.nome_completo} avançou para a etapa de ${candidato.status}`
        : activityType === "offer"
        ? `Oferta enviada para ${candidato.nome_completo}`
        : `Nova candidata "${candidato.nome_completo}" adicionada`;

      activities.push({
        id: `candidate-${candidato.id}`,
        type: activityType,
        description,
        date: format(new Date(candidato.criado_em), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
      });
    });

    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
  const timelineSteps = getTimelineSteps(vaga.status, vaga.criado_em);
  const activities = getRecentActivities();
  const progress = (timelineSteps.filter(s => s.status === "completed").length / timelineSteps.length) * 100;

  return (
    <div className="relative flex min-h-screen w-full flex-col font-display bg-background-light dark:bg-background-dark">
      {/* Main Content */}
      <main className="flex-1 px-6 sm:px-10 lg:px-20 py-8">
        <div className="mx-auto max-w-7xl">
          {/* Title Section */}
          <div className="mb-8">
            <h1 className="text-primary-text-light dark:text-primary-text-dark text-4xl font-black tracking-tight">
              Status da Contratação: {vaga.titulo}
            </h1>
            <p className="text-secondary-text-light dark:text-secondary-text-dark text-base font-normal mt-2">
              Acompanhe o progresso do processo de contratação para a vaga de {vaga.titulo}, {vaga.empresa}.
            </p>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <div className="flex flex-col gap-2 rounded-lg p-6 bg-white dark:bg-background-dark border border-gray-200 dark:border-secondary-text-light/20 shadow-sm">
              <p className="text-secondary-text-light dark:text-secondary-text-dark text-base font-medium">
                Etapa Atual da Contratação
              </p>
              <p className="text-primary-text-light dark:text-primary-text-dark text-3xl font-bold">
                {vaga.status}
              </p>
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
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                      step.status === "completed" ? "bg-primary" :
                      step.status === "current" ? "bg-primary animate-pulse" :
                      "bg-gray-200 dark:bg-secondary-text-light/20"
                    }`}>
                      {step.status === "completed" && (
                        <span className="material-symbols-outlined text-primary-text-light text-xl">check</span>
                      )}
                      {step.status === "current" && (
                        <div className="w-3 h-3 bg-primary-text-light rounded-full"></div>
                      )}
                    </div>
                    <p className={`mt-2 ${step.status === "current" ? "font-bold text-primary-text-light dark:text-primary-text-dark" : ""}`}>
                      {step.label}
                    </p>
                    <p className="text-xs">{step.dates}</p>
                  </div>
                ))}
              </div>

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
