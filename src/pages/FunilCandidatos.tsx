import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { FunnelColumn } from "@/components/FunilCandidatos/FunnelColumn";
import { CandidateFunnelCard } from "@/components/FunilCandidatos/CandidateFunnelCard";
import { StatsHeader } from "@/components/FunilCandidatos/StatsHeader";
import { FilterBar } from "@/components/FunilCandidatos/FilterBar";

type StatusCandidato =
  | "Banco de Talentos"
  | "Selecionado"
  | "Entrevista Rhello"
  | "Enviado ao Cliente"
  | "Entrevista com Cliente"
  | "Feedback Cliente"
  | "Aguardando Retorno"
  | "Aprovado"
  | "Declinou"
  | "Reprovado Cliente";

interface Candidato {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  status: StatusCandidato;
  area: string | null;
  nivel: string | null;
  recrutador: string | null;
  vaga_relacionada_id: string | null;
  criado_em: string;
}

interface Vaga {
  id: string;
  titulo: string;
}

const statusColumns: StatusCandidato[] = [
  "Banco de Talentos",
  "Selecionado",
  "Entrevista Rhello",
  "Enviado ao Cliente",
  "Entrevista com Cliente",
  "Feedback Cliente",
  "Aguardando Retorno",
  "Aprovado",
  "Declinou",
  "Reprovado Cliente"
];

const statusColors: Record<StatusCandidato, string> = {
  "Banco de Talentos": "bg-info/10 text-info border-info/20",
  "Selecionado": "bg-primary/10 text-primary border-primary/20",
  "Entrevista Rhello": "bg-warning/10 text-warning border-warning/20",
  "Enviado ao Cliente": "bg-info/10 text-info border-info/20",
  "Entrevista com Cliente": "bg-warning/10 text-warning border-warning/20",
  "Feedback Cliente": "bg-warning/10 text-warning border-warning/20",
  "Aguardando Retorno": "bg-muted/50 text-muted-foreground border-muted",
  "Aprovado": "bg-success/10 text-success border-success/20",
  "Declinou": "bg-destructive/10 text-destructive border-destructive/20",
  "Reprovado Cliente": "bg-destructive/10 text-destructive border-destructive/20",
};

export default function FunilCandidatos() {
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [vagaFilter, setVagaFilter] = useState<string>("all");
  const [recrutadorFilter, setRecrutadorFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadCandidatos();
    loadVagas();
  }, []);

  async function loadVagas() {
    try {
      const { data, error } = await supabase
        .from("vagas")
        .select("id, titulo")
        .not("status", "in", '("Concluído","Cancelada")')
        .order("titulo");

      if (error) throw error;
      setVagas(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar vagas:", error);
    }
  }

  async function loadCandidatos() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("candidatos")
        .select("*")
        .neq("status", "Banco de Talentos")
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setCandidatos((data || []) as Candidato[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar candidatos",
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

    const candidatoId = active.id as string;
    const newStatus = over.id as StatusCandidato;

    try {
      const { error } = await supabase
        .from("candidatos")
        .update({ status: newStatus as any })
        .eq("id", candidatoId);

      if (error) throw error;

      setCandidatos((prev) =>
        prev.map((candidato) =>
          candidato.id === candidatoId ? { ...candidato, status: newStatus } : candidato
        )
      );

      toast({
        title: "Candidato movido com sucesso",
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

  const getCandidatosByStatus = (status: StatusCandidato) => {
    return candidatos.filter((candidato) => {
      const matchesStatus = candidato.status === status;
      const matchesVaga = vagaFilter === "all" || candidato.vaga_relacionada_id === vagaFilter;
      const matchesRecrutador = recrutadorFilter === "all" || candidato.recrutador === recrutadorFilter;
      const matchesSearch = !searchQuery || 
        candidato.nome_completo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        candidato.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesStatus && matchesVaga && matchesRecrutador && matchesSearch;
    });
  };

  // Get unique recruiters
  const recrutadores = Array.from(new Set(candidatos.map(c => c.recrutador).filter(Boolean))) as string[];

  // Count active candidates (excluding final statuses)
  const activeCandidatesCount = candidatos.filter(c => 
    c.status !== "Aprovado" && c.status !== "Declinou" && c.status !== "Reprovado Cliente"
  ).length;

  // Calculate average days in funnel
  const mediaDiasNoFunil = candidatos.length > 0
    ? Math.round(
        candidatos.reduce((acc, c) => {
          const days = Math.floor(
            (new Date().getTime() - new Date(c.criado_em).getTime()) / (1000 * 60 * 60 * 24)
          );
          return acc + days;
        }, 0) / candidatos.length
      )
    : 0;

  // Candidates in attention (more than 30 days)
  const candidatosEmAtencao = candidatos.filter(c => {
    const days = Math.floor(
      (new Date().getTime() - new Date(c.criado_em).getTime()) / (1000 * 60 * 60 * 24)
    );
    return days > 30 && c.status !== "Aprovado" && c.status !== "Declinou" && c.status !== "Reprovado Cliente";
  }).length;

  // Conversion rate
  const totalCandidatos = candidatos.length;
  const candidatosAprovados = candidatos.filter(c => c.status === "Aprovado").length;
  const taxaConversao = totalCandidatos > 0 
    ? Math.round((candidatosAprovados / totalCandidatos) * 100)
    : 0;

  const activeCandidato = activeId ? candidatos.find((c) => c.id === activeId) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-secondary/30">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFDF6" }}>
      {/* Header - Compact */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4 space-y-3">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-[#00141D]">Funil de Candidatos</h1>
            <p className="text-sm text-[#36404A] mt-1">
              {activeCandidatesCount} {activeCandidatesCount === 1 ? 'candidato' : 'candidatos'} em andamento
            </p>
          </div>

          {/* Stats */}
          <StatsHeader
            totalCandidatosAtivos={activeCandidatesCount}
            mediaDiasNoFunil={mediaDiasNoFunil}
            candidatosEmAtencao={candidatosEmAtencao}
            taxaConversao={taxaConversao}
          />

          {/* Filters */}
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            vagaFilter={vagaFilter}
            onVagaChange={setVagaFilter}
            recrutadorFilter={recrutadorFilter}
            onRecrutadorChange={setRecrutadorFilter}
            vagas={vagas}
            recrutadores={recrutadores}
          />
        </div>
      </div>

      {/* Funnel Columns */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        collisionDetection={closestCenter}
      >
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 px-6 py-4" style={{ minWidth: 'max-content' }}>
            {statusColumns.map((status) => {
              const candidatosInColumn = getCandidatosByStatus(status);
              return (
                <FunnelColumn
                  key={status}
                  status={status}
                  count={candidatosInColumn.length}
                  colorClass={statusColors[status]}
                  isOver={dragOverColumn === status}
                  onDragOver={() => setDragOverColumn(status)}
                  onDragLeave={() => setDragOverColumn(null)}
                >
                  {candidatosInColumn.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        Nenhum candidato nesta etapa ainda
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        💛 Movimente os cards conforme o andamento
                      </p>
                    </div>
                  ) : (
                    candidatosInColumn.map((candidato) => (
                      <CandidateFunnelCard
                        key={candidato.id}
                        candidato={candidato}
                        onDragStart={() => setActiveId(candidato.id)}
                      />
                    ))
                  )}
                </FunnelColumn>
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {activeCandidato && (
            <div className="w-[320px]">
              <CandidateFunnelCard
                candidato={activeCandidato}
                onDragStart={() => {}}
                isDragging
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
