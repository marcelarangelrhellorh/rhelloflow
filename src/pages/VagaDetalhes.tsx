import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit, Trash2, Users, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getBusinessDaysFromNow } from "@/lib/dateUtils";
import { ProcessTimeline } from "@/components/ProcessTimeline";
import { ActivityLog } from "@/components/ActivityLog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Vaga = {
  id: string;
  titulo: string;
  empresa: string;
  confidencial: boolean | null;
  motivo_confidencial: string | null;
  recrutador: string | null;
  cs_responsavel: string | null;
  complexidade: string | null;
  prioridade: string | null;
  status: string;
  criado_em: string;
  salario_min: number | null;
  salario_max: number | null;
  modelo_trabalho: string | null;
  horario_inicio: string | null;
  horario_fim: string | null;
  dias_semana: string[] | null;
  beneficios: string[] | null;
  requisitos_obrigatorios: string | null;
  requisitos_desejaveis: string | null;
  responsabilidades: string | null;
  observacoes: string | null;
};

type Candidato = {
  id: string;
  nome_completo: string;
  nivel: string | null;
  area: string | null;
  status: string;
  criado_em: string;
};

export default function VagaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadVaga();
      loadCandidatos();
    }
  }, [id]);

  const loadVaga = async () => {
    try {
      const { data, error } = await supabase
        .from("vagas")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setVaga(data);
    } catch (error) {
      console.error("Erro ao carregar vaga:", error);
      toast.error("Erro ao carregar vaga");
    } finally {
      setLoading(false);
    }
  };

  const loadCandidatos = async () => {
    try {
      const { data, error } = await supabase
        .from("candidatos")
        .select("id, nome_completo, nivel, area, status, criado_em")
        .eq("vaga_relacionada_id", id)
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setCandidatos(data || []);
    } catch (error) {
      console.error("Erro ao carregar candidatos:", error);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("vagas")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Vaga excluída com sucesso!");
      navigate("/vagas");
    } catch (error) {
      console.error("Erro ao excluir vaga:", error);
      toast.error("Erro ao excluir vaga");
    }
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === "Contratado") return "bg-success/10 text-success border-success/20";
    if (status.includes("Reprovado")) return "bg-destructive/10 text-destructive border-destructive/20";
    if (status === "Banco de Talentos") return "bg-warning/10 text-warning border-warning/20";
    return "bg-primary/10 text-primary border-primary/20";
  };

  // Map status to timeline steps
  const getTimelineSteps = (currentStatus: string, criadoEm: string) => {
    const statusOrder = [
      "A iniciar",
      "Discovery", 
      "Triagem",
      "Entrevistas Rhello",
      "Apresentação de Candidatos",
      "Entrevista cliente"
    ];
    
    const currentIndex = statusOrder.indexOf(currentStatus);
    
    return statusOrder.map((status, index) => ({
      label: status,
      dates: index === 0 ? format(new Date(criadoEm), "d MMM", { locale: ptBR }) : undefined,
      status: index < currentIndex ? "completed" as const : 
              index === currentIndex ? "current" as const : 
              "pending" as const
    }));
  };

  // Generate mock activities based on candidates
  const getRecentActivities = () => {
    const activities: Array<{
      id: string;
      type: "offer" | "status_change" | "candidate_added" | "process_started";
      description: string;
      date: string;
    }> = [];

    if (vaga) {
      activities.push({
        id: "1",
        type: "process_started",
        description: `Processo de contratação para ${vaga.titulo} iniciado`,
        date: format(new Date(vaga.criado_em), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
      });
    }

    candidatos.slice(0, 3).forEach((candidato, index) => {
      activities.push({
        id: `candidate-${candidato.id}`,
        type: index === 0 ? "status_change" : "candidate_added",
        description: index === 0 
          ? `${candidato.nome_completo} avançou para a etapa de ${candidato.status}`
          : `Nova candidata "${candidato.nome_completo}" adicionada`,
        date: format(new Date(candidato.criado_em), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
      });
    });

    return activities;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!vaga) {
    return (
      <div className="p-8">
        <p>Vaga não encontrada</p>
      </div>
    );
  }

  const daysOpen = getBusinessDaysFromNow(vaga.criado_em);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header with back button and actions */}
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/vagas")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/vagas/${id}/editar`)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir esta vaga? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Title and subtitle */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Status da Contratação: {vaga.titulo}</h1>
        <p className="text-muted-foreground">
          Acompanhe o progresso do processo de contratação para a vaga de {vaga.titulo}, {vaga.empresa}.
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Etapa Atual da Contratação</p>
            <h2 className="text-2xl font-bold">{vaga.status}</h2>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Candidatos Ativos</p>
            <h2 className="text-5xl font-bold">{candidatos.length}</h2>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Duração do Processo</p>
            <h2 className="text-5xl font-bold">{daysOpen} <span className="text-xl">Dias</span></h2>
          </CardContent>
        </Card>
      </div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Timeline and Candidates - Left column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Process Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Linha do Tempo do Processo</CardTitle>
            </CardHeader>
            <CardContent>
              <ProcessTimeline steps={getTimelineSteps(vaga.status, vaga.criado_em)} />
            </CardContent>
          </Card>

          {/* Active Candidates Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Candidatos Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {candidatos.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">
                  Nenhum candidato relacionado a esta vaga
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome do Candidato</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Última Atualização</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidatos.map((candidato) => (
                      <TableRow key={candidato.id}>
                        <TableCell className="font-medium">{candidato.nome_completo}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusBadgeClass(candidato.status)}>
                            {candidato.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(candidato.criado_em), "d 'de' MMM", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="link"
                            className="text-primary font-semibold"
                            onClick={() => navigate(`/candidatos/${candidato.id}`)}
                          >
                            Visualizar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Log - Right column (1/3 width) */}
        <div>
          <ActivityLog activities={getRecentActivities()} />
        </div>
      </div>
    </div>
  );
}
