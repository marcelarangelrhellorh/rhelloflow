import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Clock, Users, Briefcase, MapPin, DollarSign, FileText, Calendar, CheckCircle2, MessageSquare, AlertCircle, UserPlus, ArrowRightLeft, Activity, PartyPopper, Search, CalendarIcon, X } from "lucide-react";
import { format, differenceInDays, isAfter, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatSalaryRange } from "@/lib/salaryUtils";
import { JOB_STAGES, calculateProgress, getStageBySlug, getStageByName } from "@/lib/jobStages";
import { cn } from "@/lib/utils";
import { ClientCandidateDrawer } from "@/components/CandidatoDetalhes/ClientCandidateDrawer";
import { useClientJobs, useJobCandidates } from "@/hooks/useClientJobs";
import { useUserRole } from "@/hooks/useUserRole";
import { useVagaEventosQuery } from "@/hooks/data/useVagaEventosQuery";
import { logger } from "@/lib/logger";
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
  token: string;
}
export default function Acompanhamento() {
  const {
    roles
  } = useUserRole();
  const [userId, setUserId] = useState<string | null>(null);
  const [stageHistory, setStageHistory] = useState<StageHistory[]>([]);
  const [selectedVaga, setSelectedVaga] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [candidateDrawerOpen, setCandidateDrawerOpen] = useState(false);
  const [candidatesWithoutFeedback, setCandidatesWithoutFeedback] = useState<CandidateWithoutFeedback[]>([]);
  const [noFeedbackDrawerOpen, setNoFeedbackDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);

  // FASE 3: Usar hooks otimizados com views materializadas
  const {
    data: vagas = [],
    isLoading: loadingVagas
  } = useClientJobs(userId || undefined);
  const {
    data: candidatos = []
  } = useJobCandidates(selectedVaga || undefined);
  const {
    eventos: vagaEventos
  } = useVagaEventosQuery(selectedVaga || undefined);
  const loading = loadingVagas;

  // Carregar user ID quando roles estiverem disponíveis
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) return;
        const isClient = roles.includes('client');
        if (isClient) {
          setUserId(user.id);
        }
      } catch (error) {
        logger.error('Error loading user ID:', error);
      }
    };
    if (roles.length > 0) {
      loadUserId();
    }
  }, [roles]);
  const loadStageHistory = async (jobsList: typeof vagas) => {
    try {
      const vagaIds = jobsList.map(v => v.id);
      if (vagaIds.length === 0) return;
      const {
        data: historyData,
        error: historyError
      } = await supabase.from("job_stage_history").select("*").in("job_id", vagaIds).order("changed_at", {
        ascending: false
      });
      if (historyError) throw historyError;
      setStageHistory(historyData || []);

      // Load candidates without feedback
      await loadCandidatesWithoutFeedback(vagaIds);
    } catch (error) {
      logger.error("Error loading stage history:", error);
    }
  };
  useEffect(() => {
    if (vagas.length > 0) {
      loadStageHistory(vagas);
    }
  }, [vagas]);
  const loadCandidatesWithoutFeedback = async (vagaIds: string[]) => {
    try {
      const {
        data: requests,
        error: requestsError
      } = await supabase.from("feedback_requests").select("id, candidato_id, vaga_id, created_at, expires_at, token").in("vaga_id", vagaIds).gt("expires_at", new Date().toISOString()).order("created_at", {
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
          request_expires: req.expires_at,
          token: req.token
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

  // Filter vagas based on search and date
  const filteredVagas = useMemo(() => {
    return vagas.filter(vaga => {
      // Text search filter
      const matchesSearch = searchTerm === "" || vaga.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || vaga.empresa.toLowerCase().includes(searchTerm.toLowerCase());

      // Date filter - show vagas created on or after selected date
      const matchesDate = !dateFilter || !isBefore(startOfDay(new Date(vaga.criado_em)), startOfDay(dateFilter));
      return matchesSearch && matchesDate;
    });
  }, [vagas, searchTerm, dateFilter]);

  // Calculate metrics
  const totalVagasAbertas = vagas.length;
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

  // Check if candidate has pending feedback request
  const hasPendingFeedback = (candidateId: string) => {
    return candidatesWithoutFeedback.some(c => c.id === candidateId);
  };

  // Calculate progress and timeline based on current status
  const getTimelineSteps = (currentStatus: string) => {
    // Normalize status: try to match by slug or name
    const currentStage = getStageBySlug(currentStatus) || getStageByName(currentStatus);
    return JOB_STAGES.filter(stage => stage.kind === "normal").map(stage => {
      const isCompleted = currentStage ? stage.order <= currentStage.order : false;
      const isCurrent = stage.slug === currentStage?.slug;
      return {
        label: stage.name,
        status: isCompleted && !isCurrent ? "completed" : isCurrent ? "current" : "pending" as const
      };
    });
  };
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>;
  }
  return <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 p-6 space-y-6 max-w-[calc(100%-24rem)] mx-[130px] shadow-none">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meus Processos</h1>
          <p className="text-muted-foreground mt-1 font-medium text-base">Acompanhe o andamento das suas vagas em aberto</p>
        </div>

        {/* Metrics Cards */}
        {!selectedVaga && <div className="grid gap-4 sm:grid-cols-2 max-w-xl mt-6">
            <Card className="border-2 border-primary bg-primary/5 mx-0 px-0 shadow-md">
              <CardContent className="p-4 shadow-none">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-muted-foreground mb-1 font-semibold text-lg">Vagas em Aberto</p>
                    <p className="text-2xl font-bold text-foreground">{totalVagasAbertas}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card onClick={() => setNoFeedbackDrawerOpen(true)} className="border-2 border-orange-500 bg-orange-500/5 cursor-pointer transition-all hover:border-orange-600 hover:bg-orange-500/10 group shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-muted-foreground mb-1 font-semibold text-lg">Aguardando Feedback</p>
                    <p className="text-2xl font-bold text-foreground">{totalSemFeedback}</p>
                    {totalSemFeedback > 0 && <p className="text-orange-600 font-semibold mt-1 group-hover:text-orange-700 text-base">
                        Clique para dar feedback
                      </p>}
                  </div>
                  <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>}

        {/* Divider with instruction and filters */}
        {!selectedVaga && vagas.length > 0 && <div className="space-y-4 mt-6">
            <div className="w-full h-px bg-border"></div>
            <p className="text-muted-foreground font-medium text-base">Para acessar os detalhes da vaga, clique sobre ela</p>
            
            {/* Search Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Pesquisar por título ou empresa..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 text-base font-medium" />
                {searchTerm && <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setSearchTerm("")}>
                    <X className="h-4 w-4" />
                  </Button>}
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full sm:w-[200px] justify-start text-left font-medium text-base", !dateFilter && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFilter ? format(dateFilter, "dd/MM/yyyy", {
                    locale: ptBR
                  }) : "Filtrar por data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={dateFilter} onSelect={setDateFilter} initialFocus className={cn("p-3 pointer-events-auto")} locale={ptBR} />
                </PopoverContent>
              </Popover>
              
              {dateFilter && <Button variant="ghost" size="sm" onClick={() => setDateFilter(undefined)} className="text-muted-foreground">
                  <X className="h-4 w-4 mr-1" />
                  Limpar data
                </Button>}
            </div>
            
            {/* Results count */}
            {(searchTerm || dateFilter) && <p className="text-sm text-muted-foreground">
                {filteredVagas.length} vaga{filteredVagas.length !== 1 ? 's' : ''} encontrada{filteredVagas.length !== 1 ? 's' : ''}
              </p>}
          </div>}

        {/* Vagas Overview - Small Cards */}
        {!selectedVaga && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
            {filteredVagas.map(vaga => {
            const vagaCandidatosCount = candidatos.filter(c => c.vaga_relacionada_id === vaga.id).length;
            const currentStage = getStageBySlug(vaga.status);
            return <Card key={vaga.id} className="cursor-pointer transition-all shadow-sm hover:shadow-md border-2 border-border hover:border-muted-foreground/50" onClick={() => setSelectedVaga(vaga.id)}>
                  <CardContent className="p-4 shadow-md">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-foreground line-clamp-2 text-base">{vaga.titulo}</h3>
                      </div>
                      <p className="text-muted-foreground font-semibold text-base">
                        {formatSalaryRange(vaga.salario_min, vaga.salario_max, vaga.salario_modalidade)}
                      </p>
                      <div className="pt-2 border-t border-border">
                        <Badge variant="secondary" className="text-sm font-semibold bg-[#ffcd00]">
                          {currentStage?.name || vaga.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>;
          })}
          </div>}

        {/* Selected Vaga Details */}
        {selectedVaga && selectedVagaData && <div className="space-y-6 mt-6">
            {/* Back Button */}
            <Button variant="ghost" onClick={() => setSelectedVaga(null)} className="mb-4 text-base">
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
              <Card className="border-primary shadow-sm">
                <CardContent className="p-4">
                  <p className="text-muted-foreground mb-1 text-base font-semibold">Etapa Atual</p>
                  <Badge variant="secondary" className="text-sm bg-[#ffcd00]">
                    {getStageBySlug(selectedVagaData.status)?.name || selectedVagaData.status}
                  </Badge>
                </CardContent>
              </Card>

              <Card className="border-primary shadow-sm">
                <CardContent className="p-4">
                  <p className="text-muted-foreground mb-1 text-base font-semibold">Candidatos</p>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-semibold">{vagaCandidatos.length}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary shadow-sm">
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

              {selectedVagaData.modelo_trabalho && <Card className="border-primary shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-muted-foreground mb-1 text-base font-semibold">Modelo</p>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-lg font-semibold">{selectedVagaData.modelo_trabalho}</span>
                    </div>
                  </CardContent>
                </Card>}

              {selectedVagaData.regime && <Card className="border-primary shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground mb-1">Contratação</p>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-lg font-semibold">{selectedVagaData.regime}</span>
                    </div>
                  </CardContent>
                </Card>}

              <Card className="border-primary shadow-sm">
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
            {selectedVagaData.beneficios && selectedVagaData.beneficios.length > 0 && <Card className="shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">Benefícios Oferecidos</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedVagaData.beneficios.map((beneficio, index) => <Badge key={index} variant="outline" className="bg-primary/10 text-primary border-primary/20 text-base font-semibold">
                        {beneficio}
                      </Badge>)}
                  </div>
                  {selectedVagaData.beneficios_outros && <p className="text-sm text-muted-foreground mt-3">{selectedVagaData.beneficios_outros}</p>}
                </CardContent>
              </Card>}

            {/* Process Timeline */}
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-6">Linha do Tempo do Processo</h3>
                <div className="relative overflow-x-auto pb-4">
                  {/* Horizontal line background */}
                  <div className="absolute top-5 left-5 right-5 h-0.5 bg-border z-0" />
                  
                  <div className="flex items-start gap-0 relative min-w-max px-5">
                    {getTimelineSteps(selectedVagaData.status).map((step, index, array) => <div key={index} className="flex flex-col items-center flex-1 min-w-[120px] relative">
                        {/* Active connector line - shows when previous step is completed */}
                        {index > 0 && array[index - 1].status === "completed" && <div className="absolute top-5 right-1/2 w-full h-0.5 bg-primary z-10" />}
                        
                        {/* Half active line for current step */}
                        {step.status === "current" && index > 0 && <div className="absolute top-5 right-1/2 w-full h-0.5 bg-primary z-10" />}
                        
                        {/* Circle */}
                        <div className={cn("relative z-20 w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-all", step.status === "completed" && "bg-primary", step.status === "current" && "bg-primary animate-pulse", step.status === "pending" && "bg-border")}>
                          {step.status === "completed" && <CheckCircle2 className="h-5 w-5 text-primary-foreground" />}
                          {step.status === "current" && <div className="w-3 h-3 bg-primary-foreground rounded-full" />}
                        </div>

                        {/* Label */}
                        <p className={cn("text-sm text-center font-semibold leading-tight", step.status === "pending" ? "text-muted-foreground" : "text-foreground")}>
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
            {vagaCandidatos.length > 0 && <Card className="shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Candidatos ({vagaCandidatos.length})</h3>
                  <div className="space-y-3">
                    {vagaCandidatos.map(candidato => {
                  const isPendingFeedback = hasPendingFeedback(candidato.id);
                  return <div key={candidato.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleCandidateClick(candidato.id)}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-foreground text-base font-semibold">{candidato.nome_completo}</p>
                            {isPendingFeedback && <Badge className="bg-orange-500 text-white border-orange-600 text-sm px-3 py-1 font-bold shadow-sm">
                                <MessageSquare className="h-4 w-4 mr-1.5" />
                                Feedback Pendente
                              </Badge>}
                          </div>
                          <p className="text-muted-foreground text-base font-medium">
                            Desde {format(new Date(candidato.criado_em), "dd/MM/yyyy", {
                          locale: ptBR
                        })}
                          </p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(candidato.status)} className="text-base font-semibold bg-[#ffcd00]/[0.36]">
                          {candidato.status}
                        </Badge>
                      </div>;
                })}
                  </div>
                </CardContent>
              </Card>}
          </div>}

        {/* Empty State */}
        {!selectedVaga && vagas.length === 0 && <Card className="shadow-sm mt-6">
            <CardContent className="p-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum processo em andamento no momento</p>
            </CardContent>
          </Card>}
        </div>

        {/* Right Sidebar - Recent Activities */}
        {selectedVaga && vagaEventos.length > 0 && <div className="fixed right-0 top-16 w-80 lg:w-96 h-[calc(100vh-4rem)] border-l border-border bg-muted/30 p-6 hidden lg:block">
          <div className="sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Atividades Recentes</h3>
            </div>
            <div className="space-y-4 max-h-[calc(100vh-150px)] overflow-y-auto">
              {vagaEventos.slice(0, 15).map(evento => {
              const getEventIcon = () => {
                switch (evento.tipo) {
                  case "CANDIDATO_ADICIONADO":
                    return {
                      icon: UserPlus,
                      bgClass: "bg-green-500/20",
                      textClass: "text-green-600 dark:text-green-400"
                    };
                  case "CANDIDATO_MOVIDO":
                    return {
                      icon: ArrowRightLeft,
                      bgClass: "bg-blue-500/20",
                      textClass: "text-blue-600 dark:text-blue-400"
                    };
                  case "ETAPA_ALTERADA":
                    return {
                      icon: CheckCircle2,
                      bgClass: "bg-blue-500/20",
                      textClass: "text-blue-600 dark:text-blue-400"
                    };
                  case "FEEDBACK_ADICIONADO":
                    return {
                      icon: MessageSquare,
                      bgClass: "bg-orange-500/20",
                      textClass: "text-orange-600 dark:text-orange-400"
                    };
                  default:
                    return {
                      icon: Activity,
                      bgClass: "bg-gray-500/20",
                      textClass: "text-gray-600 dark:text-gray-400"
                    };
                }
              };
              const {
                icon: Icon,
                bgClass,
                textClass
              } = getEventIcon();
              return <div key={evento.id} className="flex items-start gap-3">
                  <div className={cn("flex-shrink-0 mt-0.5 size-8 rounded-full flex items-center justify-center", bgClass)}>
                    <Icon className={cn("h-4 w-4", textClass)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium text-base text-left">
                      {evento.descricao}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-sm font-semibold">
                      {format(new Date(evento.created_at), "d 'de' MMMM 'às' HH:mm", {
                      locale: ptBR
                    })}
                    </p>
                  </div>
                </div>;
            })}
            </div>
          </div>
        </div>}
      </div>

      {/* Candidate Details Drawer */}
      {selectedCandidateId && <ClientCandidateDrawer open={candidateDrawerOpen} onOpenChange={setCandidateDrawerOpen} candidateId={selectedCandidateId} />}

      {/* Candidates Without Feedback Drawer */}
      <Sheet open={noFeedbackDrawerOpen} onOpenChange={setNoFeedbackDrawerOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-2xl flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-orange-500" />
              Candidatos Aguardando Feedback
            </SheetTitle>
            <SheetDescription>
              Clique em um candidato para acessar o link de feedback e enviar sua avaliação
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {candidatesWithoutFeedback.length > 0 ? candidatesWithoutFeedback.map(candidate => <Card key={candidate.id} className="cursor-pointer shadow-sm hover:shadow-md transition-all border-2 border-border hover:border-orange-500 group" onClick={() => {
            setSelectedCandidateId(candidate.id);
            setCandidateDrawerOpen(true);
            setNoFeedbackDrawerOpen(false);
          }}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-bold text-foreground text-lg group-hover:text-orange-600 transition-colors">{candidate.nome_completo}</p>
                          <p className="text-muted-foreground font-medium text-sm">{candidate.email}</p>
                        </div>
                        <Badge className="bg-orange-500 text-white border-orange-600 font-semibold shadow-sm">
                          Pendente
                        </Badge>
                      </div>

                      <div className="pt-3 border-t border-border">
                        <p className="flex items-center gap-2 text-base font-bold text-foreground mb-2">
                          <Briefcase className="h-4 w-4 text-primary" />
                          {candidate.vaga_titulo}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <p className="text-muted-foreground font-medium">
                            <span className="font-semibold">Solicitado:</span> {format(new Date(candidate.request_created), "dd/MM/yyyy", {
                        locale: ptBR
                      })}
                          </p>
                          <p className="text-muted-foreground font-medium">
                            <span className="font-semibold">Expira:</span> {format(new Date(candidate.request_expires), "dd/MM/yyyy", {
                        locale: ptBR
                      })}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold" onClick={e => {
                    e.stopPropagation();
                    window.open(`/feedback/${candidate.token}`, '_blank');
                  }}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Dar Feedback Agora
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>) : <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground font-medium text-lg">Todos os feedbacks foram respondidos!</p>
                <p className="text-muted-foreground text-sm mt-2">Não há solicitações de feedback pendentes no momento.</p>
              </div>}
          </div>
        </SheetContent>
      </Sheet>
    </div>;
}