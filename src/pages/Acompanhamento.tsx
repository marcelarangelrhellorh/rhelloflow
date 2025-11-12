import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Clock, Users, Briefcase, MapPin, DollarSign, FileText, Calendar, CheckCircle2, MessageSquare, AlertCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatSalaryRange } from "@/lib/salaryUtils";
import { JOB_STAGES, calculateProgress, getStageBySlug } from "@/lib/jobStages";
import { cn } from "@/lib/utils";
import { ClientCandidateDrawer } from "@/components/CandidatoDetalhes/ClientCandidateDrawer";
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
interface CandidateWithoutFeedback {
  id: string;
  nome_completo: string;
  email: string;
  vaga_relacionada_id: string;
  vaga_titulo: string;
  request_created: string;
  request_expires: string;
}
export default function Acompanhamento() {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [stageHistory, setStageHistory] = useState<StageHistory[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [selectedVaga, setSelectedVaga] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [candidateDrawerOpen, setCandidateDrawerOpen] = useState(false);
  const [candidatesWithoutFeedback, setCandidatesWithoutFeedback] = useState<CandidateWithoutFeedback[]>([]);
  const [noFeedbackDrawerOpen, setNoFeedbackDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    try {
      setLoading(true);
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data: rolesData
      } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const roles = rolesData?.map(r => r.role) || [];
      const isAdmin = roles.includes('admin');
      const isClient = roles.includes('client');
      let vagasQuery = supabase.from("vagas").select("*");
      if (!isAdmin && isClient) {
        const {
          data: profile
        } = await supabase.from("profiles").select("empresa").eq("id", user.id).single();
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
      const {
        data: vagasData,
        error: vagasError
      } = await vagasQuery.order("criado_em", {
        ascending: false
      });
      if (vagasError) throw vagasError;
      setVagas(vagasData || []);
      const userIds = new Set<string>();
      vagasData?.forEach(v => {
        if (v.recrutador_id) userIds.add(v.recrutador_id);
        if (v.cs_id) userIds.add(v.cs_id);
      });
      if (userIds.size > 0) {
        const {
          data: profilesData,
          error: profilesError
        } = await supabase.from("profiles").select("id, full_name").in("id", Array.from(userIds));
        if (!profilesError && profilesData) {
          const profilesMap = new Map(profilesData.map(p => [p.id, p.full_name]));
          setProfiles(profilesMap);
        }
      }
      const vagaIds = vagasData?.map(v => v.id) || [];
      if (vagaIds.length > 0) {
        const {
          data: candidatosData,
          error: candidatosError
        } = await supabase.from("candidatos").select("*").in("vaga_relacionada_id", vagaIds).order("criado_em", {
          ascending: false
        });
        if (candidatosError) throw candidatosError;
        setCandidatos(candidatosData || []);
      } else {
        setCandidatos([]);
      }
      if (vagaIds.length > 0) {
        const {
          data: historyData,
          error: historyError
        } = await supabase.from("job_stage_history").select("*").in("job_id", vagaIds).order("changed_at", {
          ascending: false
        });
        if (historyError) throw historyError;
        setStageHistory(historyData || []);
      } else {
        setStageHistory([]);
      }

      // Load candidates without feedback
      if (vagaIds.length > 0) {
        await loadCandidatesWithoutFeedback(vagaIds);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };
  const loadCandidatesWithoutFeedback = async (vagaIds: string[]) => {
    try {
      // Get all feedback requests for these vagas
      const {
        data: requests,
        error: requestsError
      } = await supabase.from("feedback_requests").select("id, candidato_id, vaga_id, created_at, expires_at").in("vaga_id", vagaIds).gt("expires_at", new Date().toISOString()).order("created_at", {
        ascending: false
      });
      if (requestsError) throw requestsError;
      if (!requests || requests.length === 0) {
        setCandidatesWithoutFeedback([]);
        return;
      }

      // Get all feedbacks for these requests
      const requestIds = requests.map(r => r.id);
      const {
        data: feedbacks,
        error: feedbacksError
      } = await supabase.from("feedbacks").select("request_id").in("request_id", requestIds);
      if (feedbacksError) throw feedbacksError;

      // Find requests without feedback
      const feedbackRequestIds = new Set(feedbacks?.map(f => f.request_id) || []);
      const requestsWithoutFeedback = requests.filter(r => !feedbackRequestIds.has(r.id));
      if (requestsWithoutFeedback.length === 0) {
        setCandidatesWithoutFeedback([]);
        return;
      }

      // Get candidate and vaga info
      const candidateIds = [...new Set(requestsWithoutFeedback.map(r => r.candidato_id))];
      const {
        data: candidatesData,
        error: candidatesError
      } = await supabase.from("candidatos").select("id, nome_completo, email, vaga_relacionada_id").in("id", candidateIds);
      if (candidatesError) throw candidatesError;
      const {
        data: vagasData,
        error: vagasError
      } = await supabase.from("vagas").select("id, titulo").in("id", vagaIds);
      if (vagasError) throw vagasError;

      // Build the result
      const vagasMap = new Map(vagasData?.map(v => [v.id, v.titulo]) || []);
      const candidatesMap = new Map(candidatesData?.map(c => [c.id, c]) || []);
      const result: CandidateWithoutFeedback[] = requestsWithoutFeedback.map(req => {
        const candidate = candidatesMap.get(req.candidato_id);
        return {
          id: req.candidato_id,
          nome_completo: candidate?.nome_completo || "Desconhecido",
          email: candidate?.email || "",
          vaga_relacionada_id: req.vaga_id,
          vaga_titulo: vagasMap.get(req.vaga_id) || "Vaga não encontrada",
          request_created: req.created_at,
          request_expires: req.expires_at
        };
      });
      setCandidatesWithoutFeedback(result);
    } catch (error) {
      console.error("Erro ao carregar candidatos sem feedback:", error);
      setCandidatesWithoutFeedback([]);
    }
  };
  const selectedVagaData = vagas.find(v => v.id === selectedVaga);
  const vagaCandidatos = candidatos.filter(c => c.vaga_relacionada_id === selectedVaga);
  const vagaHistory = stageHistory.filter(h => h.job_id === selectedVaga);

  // Calculate metrics
  const totalVagasAbertas = vagas.length;
  const totalCandidatos = candidatos.length;
  const totalSemFeedback = candidatesWithoutFeedback.length;

  // Get badge variant based on candidate status
  const getStatusBadgeVariant = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('aprovado') || statusLower.includes('contratado')) {
      return 'default'; // Green/success
    }
    if (statusLower.includes('processo') || statusLower.includes('andamento')) {
      return 'secondary'; // Blue
    }
    if (statusLower.includes('recusado') || statusLower.includes('reprovado')) {
      return 'destructive'; // Red
    }
    return 'outline'; // Default gray
  };
  const handleCandidateClick = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    setCandidateDrawerOpen(true);
  };

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
    return <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>;
  }
  return <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meus Processos</h1>
          <p className="text-muted-foreground mt-1 font-medium">Acompanhe o andamento das suas vagas em aberto</p>
        </div>

        {/* Metrics Cards */}
        {!selectedVaga && <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-2">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground mb-1 font-semibold text-base">Vagas em Aberto</p>
                    <p className="text-3xl font-bold text-foreground">{totalVagasAbertas}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Briefcase className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground mb-1 font-semibold text-base">Total de Candidatos</p>
                    <p className="text-3xl font-bold text-foreground">{totalCandidatos}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 cursor-pointer transition-all hover:shadow-md hover:border-primary/50" onClick={() => setNoFeedbackDrawerOpen(true)}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground mb-1 font-semibold text-base">Sem Feedback</p>
                    <p className="text-3xl font-bold text-foreground">{totalSemFeedback}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>}

        {/* Vagas Overview - Small Cards */}
        {!selectedVaga && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vagas.map(vaga => {
          const vagaCandidatosCount = candidatos.filter(c => c.vaga_relacionada_id === vaga.id).length;
          const currentStage = getStageBySlug(vaga.status);
          return <Card key={vaga.id} className="cursor-pointer transition-all hover:shadow-md border-2 hover:border-primary/50" onClick={() => setSelectedVaga(vaga.id)}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-foreground line-clamp-2 text-base">{vaga.titulo}</h3>
                      </div>
                      <p className="text-muted-foreground font-semibold text-base">
                        {formatSalaryRange(vaga.salario_min, vaga.salario_max, vaga.salario_modalidade)}
                      </p>
                      <div className="pt-2 border-t border-border">
                        <Badge variant="secondary" className="text-xs bg-[#ffcd00]">
                          {currentStage?.name || vaga.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>;
        })}
          </div>}

        {/* Selected Vaga Details */}
        {selectedVaga && selectedVagaData && <div className="space-y-6">
            {/* Back Button */}
            <Button variant="ghost" onClick={() => setSelectedVaga(null)} className="mb-4">
              ← Voltar para Meus Processos
            </Button>

            {/* Vaga Header */}
            <div>
              <h2 className="text-3xl font-bold text-foreground">{selectedVagaData.titulo}</h2>
              <p className="text-muted-foreground mt-1 text-base font-medium">{selectedVagaData.empresa} • Acompanhe o progresso do processo de contratação</p>
            </div>

            {/* Salary Badge */}
            {(selectedVagaData.salario_min || selectedVagaData.salario_max) && <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="text-xl font-semibold text-foreground">
                  {formatSalaryRange(selectedVagaData.salario_min, selectedVagaData.salario_max, selectedVagaData.salario_modalidade)}
                </span>
              </div>}

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-muted-foreground mb-1 text-base font-semibold">Etapa Atual</p>
                  <Badge variant="secondary" className="text-sm">
                    {getStageBySlug(selectedVagaData.status)?.name || selectedVagaData.status}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-muted-foreground mb-1 text-base font-semibold">Candidatos</p>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-semibold">{vagaCandidatos.length}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-muted-foreground mb-1 text-base font-semibold">Duração</p>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-semibold">
                      {differenceInDays(new Date(), new Date(selectedVagaData.criado_em))} Dias
                    </span>
                  </div>
                </CardContent>
              </Card>

              {selectedVagaData.modelo_trabalho && <Card>
                  <CardContent className="p-4">
                    <p className="text-muted-foreground mb-1 text-base font-semibold">Modelo</p>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-lg font-semibold">{selectedVagaData.modelo_trabalho}</span>
                    </div>
                  </CardContent>
                </Card>}

              {selectedVagaData.regime && <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground mb-1">Contratação</p>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-lg font-semibold">{selectedVagaData.regime}</span>
                    </div>
                  </CardContent>
                </Card>}

              <Card>
                <CardContent className="p-4">
                  <p className="text-muted-foreground mb-1 text-base font-semibold">Vaga Publicada</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-base">
                      {format(new Date(selectedVagaData.criado_em), "dd/MM/yyyy", {
                    locale: ptBR
                  })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Benefits Section */}
            {selectedVagaData.beneficios && selectedVagaData.beneficios.length > 0 && <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">Benefícios Oferecidos</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedVagaData.beneficios.map((beneficio, index) => <Badge key={index} variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {beneficio}
                      </Badge>)}
                  </div>
                  {selectedVagaData.beneficios_outros && <p className="text-sm text-muted-foreground mt-3">{selectedVagaData.beneficios_outros}</p>}
                </CardContent>
              </Card>}

            {/* Process Timeline */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-6">Linha do Tempo do Processo</h3>
                <div className="relative">
                  <div className="flex items-start justify-between gap-2 overflow-x-auto pb-4">
                    {getTimelineSteps(selectedVagaData.status).map((step, index, array) => <div key={index} className="flex flex-col items-center min-w-[100px] relative">
                        {/* Connector Line */}
                        {index < array.length - 1 && <div className={cn("absolute top-5 left-[50%] w-full h-0.5 z-0", step.status === "completed" ? "bg-primary" : "bg-border")} />}
                        
                        {/* Circle */}
                        <div className={cn("relative z-10 w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all", step.status === "completed" && "bg-primary", step.status === "current" && "bg-primary animate-pulse", step.status === "pending" && "bg-border")}>
                          {step.status === "completed" && <CheckCircle2 className="h-5 w-5 text-primary-foreground" />}
                          {step.status === "current" && <div className="w-3 h-3 bg-primary-foreground rounded-full" />}
                        </div>

                        {/* Label */}
                        <p className={cn("text-xs text-center font-medium", step.status === "pending" ? "text-muted-foreground" : "text-foreground")}>
                          {step.label}
                        </p>
                      </div>)}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground font-semibold">Progresso</span>
                    <span className="font-semibold">{calculateProgress(selectedVagaData.status)}%</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                    <div className="bg-primary h-full transition-all duration-500 rounded-full" style={{
                  width: `${calculateProgress(selectedVagaData.status)}%`
                }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Candidates List */}
            {vagaCandidatos.length > 0 && <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Candidatos ({vagaCandidatos.length})</h3>
                  <div className="space-y-3">
                    {vagaCandidatos.map(candidato => <div key={candidato.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleCandidateClick(candidato.id)}>
                        <div>
                          <p className="text-foreground text-base font-semibold">{candidato.nome_completo}</p>
                          <p className="text-muted-foreground text-base font-medium">
                            Desde {format(new Date(candidato.criado_em), "dd/MM/yyyy", {
                      locale: ptBR
                    })}
                          </p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(candidato.status)} className="bg-[#ffcd00]">
                          {candidato.status}
                        </Badge>
                      </div>)}
                  </div>
                </CardContent>
              </Card>}
          </div>}

        {/* Empty State */}
        {!selectedVaga && vagas.length === 0 && <Card>
            <CardContent className="p-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum processo em andamento no momento</p>
            </CardContent>
          </Card>}
      </div>

      {/* Candidate Details Drawer */}
      {selectedCandidateId && <ClientCandidateDrawer open={candidateDrawerOpen} onOpenChange={setCandidateDrawerOpen} candidateId={selectedCandidateId} />}

      {/* Candidates Without Feedback Drawer */}
      <Sheet open={noFeedbackDrawerOpen} onOpenChange={setNoFeedbackDrawerOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-2xl">Candidatos Sem Feedback</SheetTitle>
            <SheetDescription>
              Lista de candidatos que possuem solicitação de feedback pendente
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {candidatesWithoutFeedback.length > 0 ? candidatesWithoutFeedback.map(candidate => <Card key={candidate.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => {
            setSelectedCandidateId(candidate.id);
            setCandidateDrawerOpen(true);
            setNoFeedbackDrawerOpen(false);
          }}>
                  <CardContent className="p-4 rounded-sm bg-transparent">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-foreground">{candidate.nome_completo}</p>
                          <p className="text-muted-foreground font-medium text-sm">{candidate.email}</p>
                        </div>
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                          Pendente
                        </Badge>
                      </div>

                      <div className="pt-2 border-t border-border">
                        <p className="flex items-center gap-2 text-base font-semibold text-[#00141d]">
                          <Briefcase className="h-3.5 w-3.5" />
                          {candidate.vaga_titulo}
                        </p>
                        <p className="text-muted-foreground mt-1 text-sm font-medium">
                          Solicitado em: {format(new Date(candidate.request_created), "dd/MM/yyyy", {
                      locale: ptBR
                    })}
                        </p>
                        <p className="text-muted-foreground text-sm font-medium">
                          Expira em: {format(new Date(candidate.request_expires), "dd/MM/yyyy", {
                      locale: ptBR
                    })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>) : <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Todos os feedbacks foram respondidos!</p>
              </div>}
          </div>
        </SheetContent>
      </Sheet>
    </div>;
}