import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { FunnelColumn } from "@/components/FunilCandidatos/FunnelColumn";
import { CandidateFunnelCard } from "@/components/FunilCandidatos/CandidateFunnelCard";

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

  const activeCandidato = activeId ? candidatos.find((c) => c.id === activeId) : null;

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
              <h1 className="text-3xl font-bold text-foreground">Funil de Candidatos</h1>
              <p className="text-muted-foreground mt-1">
                Arraste e solte os cards para alterar o status dos candidatos
              </p>
            </div>
            <Badge variant="outline" className="h-10 px-4 text-base">
              {activeCandidatesCount} {activeCandidatesCount === 1 ? 'candidato' : 'candidatos'} em andamento
            </Badge>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={vagaFilter} onValueChange={setVagaFilter}>
              <SelectTrigger className="w-full sm:w-[250px] bg-background">
                <SelectValue placeholder="Filtrar por vaga" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Todas as vagas</SelectItem>
                {vagas.map((vaga) => (
                  <SelectItem key={vaga.id} value={vaga.id}>
                    {vaga.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={recrutadorFilter} onValueChange={setRecrutadorFilter}>
              <SelectTrigger className="w-full sm:w-[250px] bg-background">
                <SelectValue placeholder="Filtrar por recrutador" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Todos os recrutadores</SelectItem>
                {recrutadores.map((recrutador) => (
                  <SelectItem key={recrutador} value={recrutador}>
                    {recrutador}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <div className="w-[280px]">
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
