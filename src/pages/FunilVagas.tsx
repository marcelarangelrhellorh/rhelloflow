import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Briefcase, Calendar, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

type StatusVaga = 
  | "A iniciar"
  | "Discovery"
  | "Triagem"
  | "Entrevistas Rhello"
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
}

const statusColumns: StatusVaga[] = [
  "A iniciar",
  "Discovery",
  "Triagem",
  "Entrevistas Rhello",
  "Aguardando retorno do cliente",
  "Apresentação de Candidatos",
  "Entrevista cliente",
  "Em processo de contratação",
  "Concluído",
  "Cancelada"
];

const statusColors: Record<StatusVaga, string> = {
  "A iniciar": "bg-info/10 text-info border-info/20",
  "Discovery": "bg-info/10 text-info border-info/20",
  "Triagem": "bg-warning/10 text-warning border-warning/20",
  "Entrevistas Rhello": "bg-warning/10 text-warning border-warning/20",
  "Aguardando retorno do cliente": "bg-muted text-muted-foreground border-muted",
  "Apresentação de Candidatos": "bg-info/10 text-info border-info/20",
  "Entrevista cliente": "bg-warning/10 text-warning border-warning/20",
  "Em processo de contratação": "bg-success/10 text-success border-success/20",
  "Concluído": "bg-success/10 text-success border-success/20",
  "Cancelada": "bg-destructive/10 text-destructive border-destructive/20",
};

const priorityColors: Record<string, string> = {
  "Baixa": "text-muted-foreground",
  "Normal": "text-foreground",
  "Alta": "text-warning",
  "Urgente": "text-destructive",
};

export default function FunilVagas() {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
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
      const { data, error } = await supabase
        .from("vagas")
        .select("*")
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setVagas(data || []);
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

    if (!over || active.id === over.id) return;

    const vagaId = active.id as string;
    const newStatus = over.id as StatusVaga;

    try {
      const { error } = await supabase
        .from("vagas")
        .update({ status: newStatus })
        .eq("id", vagaId);

      if (error) throw error;

      setVagas((prev) =>
        prev.map((vaga) =>
          vaga.id === vagaId ? { ...vaga, status: newStatus } : vaga
        )
      );

      toast({
        title: "Status atualizado",
        description: `Vaga movida para ${newStatus}`,
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

  const getVagasByStatus = (status: StatusVaga) => {
    return vagas.filter((vaga) => vaga.status === status);
  };

  const getDaysOpen = (criadoEm: string | null) => {
    if (!criadoEm) return 0;
    const created = new Date(criadoEm);
    const now = new Date();
    const diff = now.getTime() - created.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const activeVaga = activeId ? vagas.find((v) => v.id === activeId) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Funil de Vagas</h1>
        <p className="text-muted-foreground">
          Arraste e solte os cards para alterar o status das vagas
        </p>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {statusColumns.map((status) => {
            const vagasInColumn = getVagasByStatus(status);
            return (
              <div key={status} className="flex flex-col gap-3">
                <div className="sticky top-0 bg-background z-10 pb-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{status}</h3>
                    <Badge variant="outline" className="ml-2">
                      {vagasInColumn.length}
                    </Badge>
                  </div>
                </div>

                <div
                  className="flex-1 bg-muted/30 rounded-lg p-3 min-h-[500px] space-y-3"
                  data-status={status}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add("ring-2", "ring-primary");
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove("ring-2", "ring-primary");
                  }}
                  onDrop={(e) => {
                    e.currentTarget.classList.remove("ring-2", "ring-primary");
                  }}
                >
                  {vagasInColumn.map((vaga) => (
                    <Card
                      key={vaga.id}
                      draggable
                      onDragStart={() => setActiveId(vaga.id)}
                      onClick={() => navigate(`/vagas/${vaga.id}`)}
                      className="cursor-move hover:shadow-md transition-shadow bg-card"
                    >
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-semibold line-clamp-2">
                          {vaga.titulo}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Briefcase className="h-3 w-3" />
                          <span className="truncate">{vaga.empresa}</span>
                        </div>
                        {vaga.recrutador && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span className="truncate">{vaga.recrutador}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{getDaysOpen(vaga.criado_em)} dias</span>
                        </div>
                        {vaga.prioridade && (
                          <div className="flex justify-end">
                            <Badge
                              variant="outline"
                              className={priorityColors[vaga.prioridade] || ""}
                            >
                              {vaga.prioridade}
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeVaga && (
            <Card className="cursor-move shadow-lg rotate-3 bg-card">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold line-clamp-2">
                  {activeVaga.titulo}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Briefcase className="h-3 w-3" />
                  <span className="truncate">{activeVaga.empresa}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
