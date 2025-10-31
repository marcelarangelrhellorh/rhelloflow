import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { StatsHeader } from "@/components/FunilVagas/StatsHeader";
import { FilterBar } from "@/components/FunilVagas/FilterBar";
import { StageColumn } from "@/components/FunilVagas/StageColumn";
import { JobCard } from "@/components/FunilVagas/JobCard";
import { JobSidePanel } from "@/components/FunilVagas/JobSidePanel";

type StatusVaga = 
  | "A iniciar"
  | "Discovery"
  | "Triagem"
  | "Entrevistas Rhello"
  | "Shortlist enviada"
  | "Entrevistas Cliente"
  | "Em fechamento"
  | "Concluídas"
  | "Aguardando retorno do cliente"
  | "Apresentação de Candidatos"
  | "Entrevista cliente"
  | "Em processo de contratação"
  | "Concluído"
  | "Cancelada";

interface Vaga {
  id: string;
  titulo: string;
  empresa: string;
  recrutador: string | null;
  status: StatusVaga;
  prioridade: string | null;
  criado_em: string | null;
  candidatos_count?: number;
}

const statusColumns: { status: StatusVaga; icon: string; color: string }[] = [
  { status: "A iniciar", icon: "🟢", color: "bg-success/10 text-success border-success/20" },
  { status: "Discovery", icon: "🔵", color: "bg-info/10 text-info border-info/20" },
  { status: "Triagem", icon: "🟣", color: "bg-warning/10 text-warning border-warning/20" },
  { status: "Entrevistas Rhello", icon: "🟠", color: "bg-warning/10 text-warning border-warning/20" },
  { status: "Shortlist enviada", icon: "🟡", color: "bg-primary/10 text-primary border-primary/20" },
  { status: "Entrevistas Cliente", icon: "⚫", color: "bg-muted/50 text-muted-foreground border-muted" },
  { status: "Em fechamento", icon: "🟤", color: "bg-success/10 text-success border-success/20" },
  { status: "Concluídas", icon: "⚪", color: "bg-success/10 text-success border-success/20" },
];

const calculateProgress = (status: string): number => {
  const progressMap: Record<string, number> = {
    "A iniciar": 10,
    "Discovery": 20,
    "Triagem": 35,
    "Entrevistas Rhello": 50,
    "Shortlist enviada": 65,
    "Entrevistas Cliente": 80,
    "Em fechamento": 90,
    "Concluídas": 100,
    "Cancelada": 0,
    // Old statuses
    "Aguardando retorno do cliente": 70,
    "Apresentação de Candidatos": 65,
    "Entrevista cliente": 80,
    "Em processo de contratação": 90,
    "Concluído": 100,
  };
  return progressMap[status] || 0;
};

const calculateDaysOpen = (criadoEm: string | null): number => {
  if (!criadoEm) return 0;
  const created = new Date(criadoEm);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - created.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export default function FunilVagas() {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [selectedVaga, setSelectedVaga] = useState<Vaga | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [recrutadorFilter, setRecrutadorFilter] = useState<string>("all");
  const [clienteFilter, setClienteFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [ordenacao, setOrdenacao] = useState<string>("recentes");

  const { toast } = useToast();
  const navigate = useNavigate();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadVagas();
  }, []);

  async function loadVagas() {
    try {
      setLoading(true);
      const { data: vagasData, error: vagasError } = await supabase
        .from("vagas")
        .select("*")
        .not("status", "in", '("Cancelada")')
        .order("criado_em", { ascending: false });

      if (vagasError) throw vagasError;

      // Load candidate counts for each vaga
      const vagasWithCounts = await Promise.all(
        (vagasData || []).map(async (vaga) => {
          const { count } = await supabase
            .from("candidatos")
            .select("*", { count: "exact", head: true })
            .eq("vaga_relacionada_id", vaga.id);
          
          return { ...vaga, candidatos_count: count || 0 };
        })
      );

      setVagas(vagasWithCounts as any);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar vagas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setDragOverColumn(null);

    if (!over || active.id === over.id) return;

    const vagaId = active.id as string;
    const newStatus = over.id as StatusVaga;

    try {
      const { error } = await supabase
        .from("vagas")
        .update({ status: newStatus as any })
        .eq("id", vagaId);

      if (error) throw error;

      setVagas((prev) =>
        prev.map((vaga) =>
          vaga.id === vagaId ? { ...vaga, status: newStatus } : vaga
        )
      );

      toast({
        title: "Vaga movida com sucesso",
        description: `Status atualizado para "${newStatus}"`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  // Get unique values for filters
  const recrutadores = Array.from(new Set(vagas.map(v => v.recrutador).filter(Boolean))) as string[];
  const clientes = Array.from(new Set(vagas.map(v => v.empresa).filter(Boolean))) as string[];
  const areas: string[] = []; // TODO: Add area field to vagas table

  // Apply filters and sorting
  const filteredVagas = vagas.filter((vaga) => {
    const matchesSearch = vaga.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vaga.empresa.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRecrutador = recrutadorFilter === "all" || vaga.recrutador === recrutadorFilter;
    const matchesCliente = clienteFilter === "all" || vaga.empresa === clienteFilter;
    
    return matchesSearch && matchesRecrutador && matchesCliente;
  }).sort((a, b) => {
    switch (ordenacao) {
      case "antigas":
        return new Date(a.criado_em || 0).getTime() - new Date(b.criado_em || 0).getTime();
      case "candidatos":
        return (b.candidatos_count || 0) - (a.candidatos_count || 0);
      case "dias":
        return calculateDaysOpen(b.criado_em) - calculateDaysOpen(a.criado_em);
      case "recentes":
      default:
        return new Date(b.criado_em || 0).getTime() - new Date(a.criado_em || 0).getTime();
    }
  });

  const getVagasByStatus = (status: StatusVaga) => {
    return filteredVagas.filter((vaga) => vaga.status === status);
  };

  // Calculate stats
  const totalVagasAbertas = filteredVagas.length;
  const mediaDiasAbertos = filteredVagas.length > 0
    ? Math.round(filteredVagas.reduce((sum, v) => sum + calculateDaysOpen(v.criado_em), 0) / filteredVagas.length)
    : 0;
  const vagasEmAtencao = filteredVagas.filter(v => calculateDaysOpen(v.criado_em) > 7).length;
  const totalCandidatosAtivos = filteredVagas.reduce((sum, v) => sum + (v.candidatos_count || 0), 0);

  const activeVaga = activeId ? vagas.find((v) => v.id === activeId) : null;

  const handleViewVaga = (vaga: Vaga) => {
    setSelectedVaga(vaga);
    setSidePanelOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-secondary/30">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Header - Fixed */}
      <div className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Funil de Vagas</h1>
              <p className="text-muted-foreground mt-1">
                Arraste e solte os cards para alterar o status das vagas
              </p>
            </div>
            <Button onClick={() => navigate("/vagas/nova")} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Nova Vaga
            </Button>
          </div>

          {/* Stats */}
          <StatsHeader
            totalVagasAbertas={totalVagasAbertas}
            mediaDiasAbertos={mediaDiasAbertos}
            vagasEmAtencao={vagasEmAtencao}
            totalCandidatosAtivos={totalCandidatosAtivos}
          />

          {/* Filters */}
          <div className="mt-4">
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
              areas={areas}
            />
          </div>
        </div>
      </div>

      {/* Funnel Columns */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        collisionDetection={closestCenter}
      >
        <div className="overflow-x-auto pb-6">
          <div className="flex gap-4 px-6 pt-6" style={{ minWidth: 'max-content' }}>
            {statusColumns.map(({ status, icon, color }) => {
              const vagasInColumn = getVagasByStatus(status);
              return (
                <StageColumn
                  key={status}
                  status={status}
                  count={vagasInColumn.length}
                  colorClass={color}
                  icon={icon}
                  isOver={dragOverColumn === status}
                  onDragOver={() => setDragOverColumn(status)}
                  onDragLeave={() => setDragOverColumn(null)}
                >
                  {vagasInColumn.map((vaga) => (
                    <JobCard
                      key={vaga.id}
                      vaga={vaga}
                      diasEmAberto={calculateDaysOpen(vaga.criado_em)}
                      progresso={calculateProgress(vaga.status)}
                      onDragStart={() => setActiveId(vaga.id)}
                      onView={() => handleViewVaga(vaga)}
                      onEdit={() => navigate(`/vagas/${vaga.id}/editar`)}
                      onDuplicate={() => toast({ title: "Funcionalidade em desenvolvimento" })}
                      onClose={() => toast({ title: "Funcionalidade em desenvolvimento" })}
                    />
                  ))}
                </StageColumn>
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {activeVaga && (
            <div className="w-[300px]">
              <JobCard
                vaga={activeVaga}
                diasEmAberto={calculateDaysOpen(activeVaga.criado_em)}
                progresso={calculateProgress(activeVaga.status)}
                onDragStart={() => {}}
                onView={() => {}}
                onEdit={() => {}}
                onDuplicate={() => {}}
                onClose={() => {}}
                isDragging
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Side Panel */}
      <JobSidePanel
        open={sidePanelOpen}
        onClose={() => setSidePanelOpen(false)}
        vaga={selectedVaga}
        diasEmAberto={selectedVaga ? calculateDaysOpen(selectedVaga.criado_em) : 0}
        onOpenFullDetails={() => {
          if (selectedVaga) {
            navigate(`/vagas/${selectedVaga.id}`);
          }
        }}
      />
    </div>
  );
}
