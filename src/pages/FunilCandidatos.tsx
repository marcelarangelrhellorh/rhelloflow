import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Mail, Phone, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

type StatusCandidato =
  | "Banco de Talentos"
  | "Triado para a vaga"
  | "Entrevista rhello"
  | "Reprovado rhello"
  | "Aprovado rhello"
  | "Entrevistas Solicitante"
  | "Reprovado Solicitante"
  | "Aprovado Solicitante"
  | "Contratado";

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
}

const statusColumns: StatusCandidato[] = [
  "Banco de Talentos",
  "Triado para a vaga",
  "Entrevista rhello",
  "Reprovado rhello",
  "Aprovado rhello",
  "Entrevistas Solicitante",
  "Reprovado Solicitante",
  "Aprovado Solicitante",
  "Contratado"
];

const statusColors: Record<StatusCandidato, string> = {
  "Banco de Talentos": "bg-info/10 text-info border-info/20",
  "Triado para a vaga": "bg-info/10 text-info border-info/20",
  "Entrevista rhello": "bg-warning/10 text-warning border-warning/20",
  "Reprovado rhello": "bg-destructive/10 text-destructive border-destructive/20",
  "Aprovado rhello": "bg-success/10 text-success border-success/20",
  "Entrevistas Solicitante": "bg-warning/10 text-warning border-warning/20",
  "Reprovado Solicitante": "bg-destructive/10 text-destructive border-destructive/20",
  "Aprovado Solicitante": "bg-success/10 text-success border-success/20",
  "Contratado": "bg-success/10 text-success border-success/20",
};

export default function FunilCandidatos() {
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
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
    loadCandidatos();
  }, []);

  async function loadCandidatos() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("candidatos")
        .select("*")
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setCandidatos(data || []);
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

    if (!over || active.id === over.id) return;

    const candidatoId = active.id as string;
    const newStatus = over.id as StatusCandidato;

    try {
      const { error } = await supabase
        .from("candidatos")
        .update({ status: newStatus })
        .eq("id", candidatoId);

      if (error) throw error;

      setCandidatos((prev) =>
        prev.map((candidato) =>
          candidato.id === candidatoId ? { ...candidato, status: newStatus } : candidato
        )
      );

      toast({
        title: "Status atualizado",
        description: `Candidato movido para ${newStatus}`,
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
    return candidatos.filter((candidato) => candidato.status === status);
  };

  const activeCandidato = activeId ? candidatos.find((c) => c.id === activeId) : null;

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
        <h1 className="text-3xl font-bold mb-2">Funil de Candidatos</h1>
        <p className="text-muted-foreground">
          Arraste e solte os cards para alterar o status dos candidatos
        </p>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {statusColumns.map((status) => {
            const candidatosInColumn = getCandidatosByStatus(status);
            return (
              <div key={status} className="flex flex-col gap-3">
                <div className="sticky top-0 bg-background z-10 pb-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{status}</h3>
                    <Badge variant="outline" className="ml-2">
                      {candidatosInColumn.length}
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
                  {candidatosInColumn.map((candidato) => (
                    <Card
                      key={candidato.id}
                      draggable
                      onDragStart={() => setActiveId(candidato.id)}
                      onClick={() => navigate(`/candidatos/${candidato.id}`)}
                      className="cursor-move hover:shadow-md transition-shadow bg-card"
                    >
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-semibold line-clamp-1">
                          {candidato.nome_completo}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{candidato.email}</span>
                        </div>
                        {candidato.telefone && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{candidato.telefone}</span>
                          </div>
                        )}
                        {(candidato.cidade || candidato.estado) && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              {[candidato.cidade, candidato.estado].filter(Boolean).join(" - ")}
                            </span>
                          </div>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          {candidato.area && (
                            <Badge variant="outline" className="text-xs">
                              {candidato.area}
                            </Badge>
                          )}
                          {candidato.nivel && (
                            <Badge variant="outline" className="text-xs">
                              {candidato.nivel}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeCandidato && (
            <Card className="cursor-move shadow-lg rotate-3 bg-card">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold line-clamp-1">
                  {activeCandidato.nome_completo}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{activeCandidato.email}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
