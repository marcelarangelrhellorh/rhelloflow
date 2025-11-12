import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, Briefcase, MapPin, DollarSign, FileText, Calendar, CheckCircle2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatSalaryRange } from "@/lib/salaryUtils";
import { JOB_STAGES, calculateProgress, getStageBySlug } from "@/lib/jobStages";
import { cn } from "@/lib/utils";

interface Vaga {
  id: string;
  titulo: string;
  empresa: string;
  status: string;
  criado_em: string;
  recrutador_id: string | null;
  cs_id: string | null;
  salario_min: number | null;
  salario_max: number | null;
  salario_modalidade: string | null;
  modelo_trabalho: string | null;
  regime?: string | null;
  beneficios: string[] | null;
  beneficios_outros: string | null;
}

interface Profile {
  id: string;
  full_name: string;
}

interface Candidato {
  id: string;
  nome_completo: string;
  status: string;
  criado_em: string;
  vaga_relacionada_id: string;
}

interface StageHistory {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  job_id: string;
}

export default function Acompanhamento() {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [stageHistory, setStageHistory] = useState<StageHistory[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [selectedVaga, setSelectedVaga] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roles = rolesData?.map(r => r.role) || [];
      const isAdmin = roles.includes('admin');
      const isClient = roles.includes('client');

      let vagasQuery = supabase
        .from("vagas")
        .select("*");
      
      if (!isAdmin && isClient) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("empresa")
          .eq("id", user.id)
          .single();

        if (profile?.empresa) {
          vagasQuery = vagasQuery.eq("empresa", profile.empresa);
        } else {
          setVagas([]);
          setCandidatos([]);
          setStageHistory([]);
          setLoading(false);
          return;
        }
      } else if (!isAdmin && !isClient) {
        setVagas([]);
        setCandidatos([]);
        setStageHistory([]);
        setLoading(false);
        return;
      }

      const { data: vagasData, error: vagasError } = await vagasQuery
        .order("criado_em", { ascending: false });

      if (vagasError) throw vagasError;
      setVagas(vagasData || []);

      const userIds = new Set<string>();
      vagasData?.forEach(v => {
        if (v.recrutador_id) userIds.add(v.recrutador_id);
        if (v.cs_id) userIds.add(v.cs_id);
      });

      if (userIds.size > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", Array.from(userIds));

        if (!profilesError && profilesData) {
          const profilesMap = new Map(profilesData.map(p => [p.id, p.full_name]));
          setProfiles(profilesMap);
        }
      }

      const vagaIds = vagasData?.map(v => v.id) || [];
      
      if (vagaIds.length > 0) {
        const { data: candidatosData, error: candidatosError } = await supabase
          .from("candidatos")
          .select("*")
          .in("vaga_relacionada_id", vagaIds)
          .order("criado_em", { ascending: false });

        if (candidatosError) throw candidatosError;
        setCandidatos(candidatosData || []);
      } else {
        setCandidatos([]);
      }

      if (vagaIds.length > 0) {
        const { data: historyData, error: historyError } = await supabase
          .from("job_stage_history")
          .select("*")
          .in("job_id", vagaIds)
          .order("changed_at", { ascending: false });

        if (historyError) throw historyError;
        setStageHistory(historyData || []);
      } else {
        setStageHistory([]);
      }

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedVagaData = vagas.find(v => v.id === selectedVaga);
  const vagaCandidatos = candidatos.filter(c => c.vaga_relacionada_id === selectedVaga);
  const vagaHistory = stageHistory.filter(h => h.job_id === selectedVaga);

  // Calculate progress and timeline based on current status
  const getTimelineSteps = (currentStatus: string) => {
    const currentStage = getStageBySlug(currentStatus);
    
    return JOB_STAGES.filter(stage => stage.kind === "normal").map(stage => {
      const isCompleted = stage.order < (currentStage?.order || 0);
      const isCurrent = stage.slug === currentStatus;
      
      return {
        label: stage.name,
        status: isCompleted ? "completed" : isCurrent ? "current" : "pending" as const
      };
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meus Processos</h1>
          <p className="text-muted-foreground mt-1">Acompanhe o andamento das suas vagas em aberto</p>
        </div>

        {/* Vagas Overview - Small Cards */}
        {!selectedVaga && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vagas.map(vaga => {
              const vagaCandidatosCount = candidatos.filter(c => c.vaga_relacionada_id === vaga.id).length;
              const currentStage = getStageBySlug(vaga.status);
              
              return (
                <Card 
                  key={vaga.id}
                  className="cursor-pointer transition-all hover:shadow-md border-2 hover:border-primary/50"
                  onClick={() => setSelectedVaga(vaga.id)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-base text-foreground line-clamp-2">{vaga.titulo}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatSalaryRange(vaga.salario_min, vaga.salario_max, vaga.salario_modalidade)}
                      </p>
                      <div className="pt-2 border-t border-border">
                        <Badge variant="secondary" className="text-xs">
                          {currentStage?.name || vaga.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Selected Vaga Details */}
        {selectedVaga && selectedVagaData && (
          <div className="space-y-6">
            {/* Back Button */}
            <Button 
              variant="ghost" 
              onClick={() => setSelectedVaga(null)}
              className="mb-4"
            >
              ← Voltar para Meus Processos
            </Button>

            {/* Vaga Header */}
            <div>
              <h2 className="text-3xl font-bold text-foreground">{selectedVagaData.titulo}</h2>
              <p className="text-muted-foreground mt-1">{selectedVagaData.empresa} • Acompanhe o progresso do processo de contratação</p>
            </div>

            {/* Salary Badge */}
            {(selectedVagaData.salario_min || selectedVagaData.salario_max) && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="text-xl font-semibold text-foreground">
                  {formatSalaryRange(selectedVagaData.salario_min, selectedVagaData.salario_max, selectedVagaData.salario_modalidade)}
                </span>
              </div>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Etapa Atual</p>
                  <Badge variant="secondary" className="text-sm">
                    {getStageBySlug(selectedVagaData.status)?.name || selectedVagaData.status}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Candidatos</p>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-semibold">{vagaCandidatos.length}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Duração</p>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-semibold">
                      {differenceInDays(new Date(), new Date(selectedVagaData.criado_em))} Dias
                    </span>
                  </div>
                </CardContent>
              </Card>

              {selectedVagaData.modelo_trabalho && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground mb-1">Modelo</p>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-lg font-semibold">{selectedVagaData.modelo_trabalho}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedVagaData.regime && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground mb-1">Contratação</p>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-lg font-semibold">{selectedVagaData.regime}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Vaga Publicada</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {format(new Date(selectedVagaData.criado_em), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Benefits Section */}
            {selectedVagaData.beneficios && selectedVagaData.beneficios.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">Benefícios Oferecidos</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedVagaData.beneficios.map((beneficio, index) => (
                      <Badge key={index} variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {beneficio}
                      </Badge>
                    ))}
                  </div>
                  {selectedVagaData.beneficios_outros && (
                    <p className="text-sm text-muted-foreground mt-3">{selectedVagaData.beneficios_outros}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Process Timeline */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-6">Linha do Tempo do Processo</h3>
                <div className="relative">
                  <div className="flex items-start justify-between gap-2 overflow-x-auto pb-4">
                    {getTimelineSteps(selectedVagaData.status).map((step, index, array) => (
                      <div key={index} className="flex flex-col items-center min-w-[100px] relative">
                        {/* Connector Line */}
                        {index < array.length - 1 && (
                          <div 
                            className={cn(
                              "absolute top-5 left-[50%] w-full h-0.5 z-0",
                              step.status === "completed" ? "bg-primary" : "bg-border"
                            )}
                          />
                        )}
                        
                        {/* Circle */}
                        <div 
                          className={cn(
                            "relative z-10 w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all",
                            step.status === "completed" && "bg-primary",
                            step.status === "current" && "bg-primary animate-pulse",
                            step.status === "pending" && "bg-border"
                          )}
                        >
                          {step.status === "completed" && (
                            <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
                          )}
                          {step.status === "current" && (
                            <div className="w-3 h-3 bg-primary-foreground rounded-full" />
                          )}
                        </div>

                        {/* Label */}
                        <p className={cn(
                          "text-xs text-center font-medium",
                          step.status === "pending" ? "text-muted-foreground" : "text-foreground"
                        )}>
                          {step.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-semibold">{calculateProgress(selectedVagaData.status)}%</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all duration-500 rounded-full"
                      style={{ width: `${calculateProgress(selectedVagaData.status)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Candidates List */}
            {vagaCandidatos.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Candidatos ({vagaCandidatos.length})</h3>
                  <div className="space-y-3">
                    {vagaCandidatos.map(candidato => (
                      <div 
                        key={candidato.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                      >
                        <div>
                          <p className="font-medium text-foreground">{candidato.nome_completo}</p>
                          <p className="text-sm text-muted-foreground">
                            Desde {format(new Date(candidato.criado_em), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge variant="outline">{candidato.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Empty State */}
        {!selectedVaga && vagas.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum processo em andamento no momento</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}