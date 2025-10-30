import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit, Trash2, User, Briefcase, Calendar, Clock } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getBusinessDaysFromNow, isWithinDeadline } from "@/lib/dateUtils";

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
};

export default function VagaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVaga();
    loadCandidatos();
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
        .select("id, nome_completo, nivel, area, status")
        .eq("vaga_relacionada_id", id);

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

  const getStatusType = (status: string): "active" | "pending" | "cancelled" | "completed" => {
    if (status === "Concluído") return "completed";
    if (status === "Cancelada") return "cancelled";
    if (status === "A iniciar" || status === "Discovery") return "pending";
    return "active";
  };

  const getCandidatoStatusType = (status: string): "active" | "pending" | "cancelled" | "completed" => {
    if (status === "Contratado") return "completed";
    if (status.includes("Reprovado")) return "cancelled";
    if (status === "Banco de Talentos") return "pending";
    return "active";
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
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

  return (
    <div className="p-8">
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

      <div className="space-y-6">
        <div>
          <div className="mb-2 flex items-center gap-2 flex-wrap">
            <h1 className="text-3xl font-bold">{vaga.titulo}</h1>
            <StatusBadge status={vaga.status} type={getStatusType(vaga.status)} />
            {(() => {
              const businessDays = getBusinessDaysFromNow(vaga.criado_em);
              const withinDeadline = isWithinDeadline(vaga.criado_em);
              return (
                <>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {businessDays} dias úteis em aberto
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={withinDeadline 
                      ? "bg-success/10 text-success border-success/20" 
                      : "bg-destructive/10 text-destructive border-destructive/20"
                    }
                  >
                    <Clock className="mr-1 h-3 w-3" />
                    {withinDeadline ? "Dentro do prazo" : "Fora do prazo"}
                  </Badge>
                </>
              );
            })()}
          </div>
          <p className="text-xl text-muted-foreground">{vaga.empresa}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Recrutador</p>
                <p className="font-medium">{vaga.recrutador || "Não atribuído"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CS Responsável</p>
                <p className="font-medium">{vaga.cs_responsavel || "Não atribuído"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Complexidade</p>
                  <p className="font-medium">{vaga.complexidade || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Prioridade</p>
                  <p className="font-medium">{vaga.prioridade || "-"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confidencial</p>
                <p className="font-medium">{vaga.confidencial ? "Sim" : "Não"}</p>
                {vaga.confidencial && vaga.motivo_confidencial && (
                  <p className="mt-1 text-sm text-muted-foreground">{vaga.motivo_confidencial}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalhes da Vaga</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Faixa Salarial</p>
                <p className="font-medium">
                  {formatCurrency(vaga.salario_min)} - {formatCurrency(vaga.salario_max)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Modelo de Trabalho</p>
                <p className="font-medium">{vaga.modelo_trabalho || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horário</p>
                <p className="font-medium">
                  {vaga.horario_inicio && vaga.horario_fim
                    ? `${vaga.horario_inicio} - ${vaga.horario_fim}`
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dias da Semana</p>
                <p className="font-medium">{vaga.dias_semana?.join(", ") || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Benefícios</p>
                <p className="font-medium">{vaga.beneficios?.join(", ") || "-"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Requisitos Obrigatórios</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{vaga.requisitos_obrigatorios || "-"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Requisitos Desejáveis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{vaga.requisitos_desejaveis || "-"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Responsabilidades</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{vaga.responsabilidades || "-"}</p>
          </CardContent>
        </Card>

        {vaga.observacoes && (
          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{vaga.observacoes}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Candidatos Relacionados ({candidatos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {candidatos.length === 0 ? (
              <p className="text-muted-foreground">Nenhum candidato relacionado a esta vaga</p>
            ) : (
              <div className="space-y-3">
                {candidatos.map((candidato) => (
                  <div
                    key={candidato.id}
                    className="flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-shadow hover:shadow-md"
                    onClick={() => navigate(`/candidatos/${candidato.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-info/10 p-2">
                        <Briefcase className="h-4 w-4 text-info" />
                      </div>
                      <div>
                        <p className="font-medium">{candidato.nome_completo}</p>
                        <p className="text-sm text-muted-foreground">
                          {candidato.nivel} - {candidato.area}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={candidato.status} type={getCandidatoStatusType(candidato.status)} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
