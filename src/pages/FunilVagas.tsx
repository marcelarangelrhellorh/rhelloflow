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

interface Vaga {
  id: string;
  titulo: string;
  empresa: string;
  recrutador: string | null;
  cs_responsavel: string | null;
  status: string;
  prioridade: string | null;
  criado_em: string | null;
  candidatos_count?: number;
  confidencial?: boolean | null;
}


export default function FunilVagas() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [recrutadorFilter, setRecrutadorFilter] = useState("all");
  const [csFilter, setCsFilter] = useState("all");
  const [clienteFilter, setClienteFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [ordenacao, setOrdenacao] = useState("recentes");

  // Filter options
  const [recrutadores, setRecrutadores] = useState<string[]>([]);
  const [csResponsaveis, setCsResponsaveis] = useState<string[]>([]);
  const [clientes, setClientes] = useState<string[]>([]);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);

      // Load jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from("vagas")
        .select("*")
        .not("status", "in", '("Cancelada")')
        .order("criado_em", { ascending: false });

      if (jobsError) throw jobsError;

      // Load candidate counts for each job
      const jobsWithCounts = await Promise.all(
        (jobsData || []).map(async (job) => {
          const { count } = await supabase
            .from("candidatos")
            .select("*", { count: "exact", head: true })
            .eq("vaga_relacionada_id", job.id);

          return { ...job, candidatos_count: count || 0 };
        })
      );

      setJobs(jobsWithCounts as any);

      // Extract unique filter options
      const uniqueRecrutadores = Array.from(
        new Set(jobsData?.map((j) => j.recrutador).filter(Boolean))
      ) as string[];
      const uniqueCS = Array.from(
        new Set(jobsData?.map((j) => j.cs_responsavel).filter(Boolean))
      ) as string[];
      const uniqueClientes = Array.from(
        new Set(jobsData?.map((j) => j.empresa).filter(Boolean))
      ) as string[];

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

  const handleJobMove = async (jobId: string, fromStage: string, toStage: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Update job status
      const { error: updateError } = await supabase
        .from("vagas")
        .update({
          status: toStage as any,
          status_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      if (updateError) throw updateError;

      // Record stage change in history
      const { error: historyError } = await supabase
        .from("job_stage_history")
        .insert({
          job_id: jobId,
          from_status: fromStage,
          to_status: toStage,
          changed_by: user?.id,
        });

      if (historyError) console.error("Error recording history:", historyError);

      // Update local state
      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId ? { ...job, status: toStage as any } : job
        )
      );

      toast.success(`Vaga movida para ${toStage}`);
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
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.empresa.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRecrutador =
      recrutadorFilter === "all" || job.recrutador === recrutadorFilter;

    const matchesCS =
      csFilter === "all" || job.cs_responsavel === csFilter;

    const matchesCliente =
      clienteFilter === "all" || job.empresa === clienteFilter;

    return matchesSearch && matchesRecrutador && matchesCS && matchesCliente;
  });

  // Calculate stats
  const totalJobs = filteredJobs.length;
  const jobsByStage = JOB_STAGES.reduce((acc, stage) => {
    acc[stage.name] = filteredJobs.filter((j) => j.status === stage.name).length;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Funil de Vagas</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Gerencie o pipeline de recrutamento
              </p>
            </div>
            <Button onClick={() => navigate("/vagas/nova")} className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Nova Vaga
            </Button>
          </div>

          {/* Stats */}
          <StatsHeader
            totalVagasAbertas={totalJobs}
            mediaDiasAbertos={0}
            vagasEmAtencao={0}
            totalCandidatosAtivos={0}
          />

          {/* Filters */}
          <div className="mt-3">
            <FilterBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              recrutadorFilter={recrutadorFilter}
              onRecrutadorChange={setRecrutadorFilter}
              clienteFilter={clienteFilter}
              onClienteChange={setClienteFilter}
              areaFilter={areaFilter}
              onAreaChange={setAreaFilter}
              ordenacao={ordenacao}
              onOrdenacaoChange={setOrdenacao}
              recrutadores={recrutadores}
              clientes={clientes}
              areas={[]}
            />
          </div>
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="flex-1 overflow-hidden p-6">
        <PipelineBoard
          jobs={filteredJobs}
          stages={JOB_STAGES}
          progresso={calculateProgress}
          onJobMove={handleJobMove}
          onJobClick={handleJobClick}
          onJobEdit={handleJobEdit}
          onJobMoveStage={handleJobMoveStage}
          onJobDuplicate={handleJobDuplicate}
          onJobClose={handleJobClose}
        />
      </div>

      {/* Job Details Drawer */}
      <JobDrawer
        jobId={selectedJobId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onEdit={() => selectedJobId && handleJobEdit(selectedJobId)}
      />
    </div>
  );
}
