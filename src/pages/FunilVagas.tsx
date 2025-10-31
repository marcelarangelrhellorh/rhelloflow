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

      // Load jobs - excluir apenas vagas canceladas
      const { data: jobsData, error: jobsError } = await supabase
        .from("vagas")
        .select("*")
        .neq("status_slug", "cancelada")
        .order("status_order", { ascending: true });

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

  const handleJobMove = async (jobId: string, fromSlug: string, toSlug: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Buscar stage de origem e destino
      const fromStage = JOB_STAGES.find(s => s.slug === fromSlug);
      const toStage = JOB_STAGES.find(s => s.slug === toSlug);
      
      if (!toStage) {
        toast.error("Etapa de destino inválida");
        return;
      }

      // Update job status usando slug e order
      const { error: updateError } = await supabase
        .from("vagas")
        .update({
          status: toStage.name as any, // Manter compatibilidade com enum legado
          status_slug: toStage.slug,
          status_order: toStage.order,
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
          from_status: fromStage?.name || fromSlug,
          to_status: toStage.name,
          changed_by: user?.id,
        });

      if (historyError) console.error("Error recording history:", historyError);
      
      // Log evento da vaga
      await logVagaEvento({
        vagaId: jobId,
        actorUserId: user?.id,
        tipo: "ETAPA_ALTERADA",
        descricao: `Etapa alterada de "${fromStage?.name || fromSlug}" para "${toStage.name}"`,
        payload: { from: fromSlug, to: toSlug }
      });

      // Update local state
      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId 
            ? { ...job, status: toStage.name as any, status_slug: toStage.slug, status_order: toStage.order } 
            : job
        )
      );

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
    acc[stage.name] = filteredJobs.filter((j) => j.status_slug === stage.slug).length;
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
    <div className="flex flex-col h-screen bg-[#FFFDF6]">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-[#00141D]">Funil de Vagas</h1>
              <p className="text-sm text-[#36404A] mt-0.5">
                Gerencie o pipeline de recrutamento
              </p>
            </div>
            <Button onClick={() => navigate("/vagas/nova")} className="h-9 rounded-lg bg-[#FFCD00] hover:bg-[#FAEC3E] text-[#00141D] font-medium">
              <Plus className="mr-2 h-4 w-4" />
              Nova Vaga
            </Button>
          </div>

          {/* Stats */}
          <div className="mb-4">
            <StatsHeader
              totalVagasAbertas={totalJobs}
              mediaDiasAbertos={0}
              vagasEmAtencao={0}
              totalCandidatosAtivos={0}
            />
          </div>

          {/* Filters */}
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

      {/* Pipeline Board */}
      <div className="flex-1 overflow-hidden p-4">
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
