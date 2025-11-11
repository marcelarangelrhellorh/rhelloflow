import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { StatsHeader } from "@/components/FunilVagas/StatsHeader";
import { FilterBar } from "@/components/FunilVagas/FilterBar";
import { PipelineBoard } from "@/components/FunilVagas/PipelineBoard";
import { JobDrawer } from "@/components/FunilVagas/JobDrawer";
import { JOB_STAGES, calculateProgress } from "@/lib/jobStages";
import { logVagaEvento } from "@/lib/vagaEventos";
import { getBusinessDaysFromNow } from "@/lib/dateUtils";
interface Vaga {
  id: string;
  titulo: string;
  empresa: string;
  recrutador: string | null;
  cs_responsavel: string | null;
  status: string; // Legado - ainda usado para exibição
  status_slug: string; // Novo campo padronizado
  status_order: number; // Ordem no funil
  prioridade: string | null;
  criado_em: string | null;
  candidatos_count?: number;
  confidencial?: boolean | null;
  area?: string | null;
  dias_etapa_atual?: number; // Dias úteis na etapa atual
}
interface StatusRef {
  slug: string;
  label: string;
  color: string;
  order: number;
}
export default function FunilVagas() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Stats
  const [mediaDiasAbertos, setMediaDiasAbertos] = useState(0);
  const [vagasForaPrazo, setVagasForaPrazo] = useState(0);
  const [totalCandidatosAtivos, setTotalCandidatosAtivos] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [recrutadorFilter, setRecrutadorFilter] = useState("all");
  const [csFilter, setCsFilter] = useState("all");
  const [clienteFilter, setClienteFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ordenacao, setOrdenacao] = useState("recentes");

  // Filter options
  const [recrutadores, setRecrutadores] = useState<string[]>([]);
  const [csResponsaveis, setCsResponsaveis] = useState<string[]>([]);
  const [clientes, setClientes] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<StatusRef[]>([]);
  useEffect(() => {
    loadStatusOptions();
    loadJobs();
  }, []);
  const loadStatusOptions = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("vaga_status_ref").select("slug, label, color, order").order("order");
      if (error) throw error;
      setStatusOptions(data || []);
    } catch (error) {
      console.error("Erro ao carregar status:", error);
    }
  };
  const loadJobs = async () => {
    try {
      setLoading(true);

      // Load jobs com JOIN na tabela users - excluir apenas vagas canceladas e deletadas
      const {
        data: jobsData,
        error: jobsError
      } = await supabase.from("vagas").select(`
          *,
          recrutador_user:users!vagas_recrutador_id_fkey(name),
          cs_user:users!vagas_cs_id_fkey(name)
        `).neq("status_slug", "cancelada").is("deleted_at", null).order("status_order", {
        ascending: true
      });
      if (jobsError) throw jobsError;

      // Load candidate counts and stage history for each job
      const jobsWithCounts = await Promise.all((jobsData || []).map(async job => {
        const {
          count
        } = await supabase.from("candidatos").select("*", {
          count: "exact",
          head: true
        }).eq("vaga_relacionada_id", job.id);

        // Buscar última mudança de etapa para calcular dias na etapa atual
        const {
          data: lastStageChange
        } = await supabase.from("job_stage_history").select("changed_at").eq("job_id", job.id).order("changed_at", {
          ascending: false
        }).limit(1).single();

        // Calcular dias úteis na etapa atual
        const referenceDate = lastStageChange?.changed_at || job.criado_em;
        const diasEtapaAtual = referenceDate ? getBusinessDaysFromNow(referenceDate) : 0;

        // Mesclar nome do recrutador e CS do JOIN
        return {
          ...job,
          candidatos_count: count || 0,
          recrutador: job.recrutador_user?.name || job.recrutador || null,
          cs_responsavel: job.cs_user?.name || job.cs_responsavel || null,
          dias_etapa_atual: diasEtapaAtual
        };
      }));
      setJobs(jobsWithCounts as any);

      // Calcular métricas
      calculateStats(jobsWithCounts);

      // Extract unique filter options
      const uniqueRecrutadores = Array.from(new Set(jobsWithCounts.map((j: any) => j.recrutador).filter(Boolean))) as string[];
      const uniqueCS = Array.from(new Set(jobsWithCounts.map((j: any) => j.cs_responsavel).filter(Boolean))) as string[];
      const uniqueClientes = Array.from(new Set(jobsData?.map(j => j.empresa).filter(Boolean))) as string[];
      setRecrutadores(uniqueRecrutadores);
      setCsResponsaveis(uniqueCS);
      setClientes(uniqueClientes);
    } catch (error) {
      console.error("Error loading jobs:", error);
      toast.error("Erro ao carregar vagas");
    } finally {
      setLoading(false);
    }
  };
  const calculateStats = (jobsData: any[]) => {
    // Filtrar apenas vagas abertas (não concluídas)
    const vagasAbertas = jobsData.filter(job => job.status_slug !== "concluida" && job.status_slug !== "cancelada");

    // Calcular média de dias úteis em aberto
    if (vagasAbertas.length > 0) {
      const totalDias = vagasAbertas.reduce((sum, job) => {
        const dias = getBusinessDaysFromNow(job.criado_em);
        return sum + dias;
      }, 0);
      setMediaDiasAbertos(Math.round(totalDias / vagasAbertas.length));
    } else {
      setMediaDiasAbertos(0);
    }

    // Contar vagas fora do prazo (>30 dias úteis)
    const foraPrazo = vagasAbertas.filter(job => {
      const dias = getBusinessDaysFromNow(job.criado_em);
      return dias > 30;
    }).length;
    setVagasForaPrazo(foraPrazo);

    // Contar total de candidatos ativos
    const totalCandidatos = jobsData.reduce((sum, job) => {
      return sum + (job.candidatos_count || 0);
    }, 0);
    setTotalCandidatosAtivos(totalCandidatos);
  };
  const handleJobMove = async (jobId: string, fromSlug: string, toSlug: string) => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();

      // Buscar stage de origem e destino
      const fromStage = JOB_STAGES.find(s => s.slug === fromSlug);
      const toStage = JOB_STAGES.find(s => s.slug === toSlug);
      if (!toStage) {
        toast.error("Etapa de destino inválida");
        return;
      }

      // Update job status usando apenas slug e order (não atualizar enum status)
      const {
        error: updateError
      } = await supabase.from("vagas").update({
        status_slug: toStage.slug,
        status_order: toStage.order,
        status_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq("id", jobId);
      if (updateError) throw updateError;

      // Record stage change in history
      const {
        error: historyError
      } = await supabase.from("job_stage_history").insert({
        job_id: jobId,
        from_status: fromStage?.name || fromSlug,
        to_status: toStage.name,
        changed_by: user?.id
      });
      if (historyError) console.error("Error recording history:", historyError);

      // Log evento da vaga
      await logVagaEvento({
        vagaId: jobId,
        actorUserId: user?.id,
        tipo: "ETAPA_ALTERADA",
        descricao: `Etapa alterada de "${fromStage?.name || fromSlug}" para "${toStage.name}"`,
        payload: {
          from: fromSlug,
          to: toSlug
        }
      });

      // Update local state
      setJobs(prev => prev.map(job => job.id === jobId ? {
        ...job,
        status: toStage.name as any,
        status_slug: toStage.slug,
        status_order: toStage.order
      } : job));
      toast.success(`Vaga movida para ${toStage.name}`);
    } catch (error) {
      console.error("Error moving job:", error);
      toast.error("Erro ao mover vaga");
    }
  };
  const handleJobClick = (jobId: string) => {
    setSelectedJobId(jobId);
    setDrawerOpen(true);
  };
  const handleJobEdit = (jobId: string) => {
    navigate(`/vagas/${jobId}/editar`);
  };
  const handleJobMoveStage = (jobId: string) => {
    toast.info("Arraste o card para mover de etapa");
  };
  const handleJobDuplicate = (jobId: string) => {
    toast.info("Funcionalidade em desenvolvimento");
  };
  const handleJobClose = (jobId: string) => {
    toast.info("Funcionalidade em desenvolvimento");
  };

  // Apply filters
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || job.empresa.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRecrutador = recrutadorFilter === "all" || job.recrutador === recrutadorFilter;
    const matchesCS = csFilter === "all" || job.cs_responsavel === csFilter;
    const matchesCliente = clienteFilter === "all" || job.empresa === clienteFilter;
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesRecrutador && matchesCS && matchesCliente && matchesStatus;
  });

  // Calculate stats
  const totalJobs = filteredJobs.length;
  const jobsByStage = JOB_STAGES.reduce((acc, stage) => {
    acc[stage.name] = filteredJobs.filter(j => j.status_slug === stage.slug).length;
    return acc;
  }, {} as Record<string, number>);
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center" style={{
      backgroundColor: '#FFFBF0'
    }}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>;
  }
  return <div className="min-h-screen" style={{
    backgroundColor: '#FFFBF0'
  }}>
      {/* Header - Compact */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4 space-y-3">
          {/* Title */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#00141D]">Funil de Vagas</h1>
              <p className="text-base text-[#36404A] mt-1">
                {totalJobs} {totalJobs === 1 ? 'vaga' : 'vagas'} no pipeline
              </p>
            </div>
            <Button onClick={() => navigate("/vagas/nova")} className="h-9 rounded-lg bg-[#FFCD00] hover:bg-[#FAEC3E] text-[#00141D] font-semibold">
              <Plus className="mr-2 h-4 w-4" />
              Nova Vaga
            </Button>
          </div>

          {/* Stats */}
          <StatsHeader totalVagasAbertas={totalJobs} mediaDiasAbertos={mediaDiasAbertos} vagasEmAtencao={vagasForaPrazo} totalCandidatosAtivos={totalCandidatosAtivos} />

          {/* Filters */}
          <FilterBar searchTerm={searchTerm} onSearchChange={setSearchTerm} recrutadorFilter={recrutadorFilter} onRecrutadorChange={setRecrutadorFilter} clienteFilter={clienteFilter} onClienteChange={setClienteFilter} areaFilter={areaFilter} onAreaChange={setAreaFilter} statusFilter={statusFilter} onStatusChange={setStatusFilter} ordenacao={ordenacao} onOrdenacaoChange={setOrdenacao} recrutadores={recrutadores} clientes={clientes} areas={[]} statusOptions={statusOptions} />
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="overflow-x-auto pb-4">
        <div className="px-6 py-4 bg-[t#36404a0f] bg-[#fdf9ee]">
          <PipelineBoard jobs={filteredJobs} stages={JOB_STAGES} progresso={calculateProgress} onJobMove={handleJobMove} onJobClick={handleJobClick} onJobEdit={handleJobEdit} onJobMoveStage={handleJobMoveStage} onJobDuplicate={handleJobDuplicate} onJobClose={handleJobClose} />
        </div>
      </div>

      {/* Job Details Drawer */}
      <JobDrawer jobId={selectedJobId} open={drawerOpen} onOpenChange={setDrawerOpen} onEdit={() => selectedJobId && handleJobEdit(selectedJobId)} />
    </div>;
}