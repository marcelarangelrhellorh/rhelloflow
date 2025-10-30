import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit, Trash2, Mail, Phone, MapPin, Linkedin, FileText, Briefcase } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type Candidato = {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  linkedin: string | null;
  curriculo_link: string | null;
  nivel: string | null;
  area: string | null;
  status: string;
  recrutador: string | null;
  vaga_relacionada_id: string | null;
  pretensao_salarial: number | null;
  feedback: string | null;
  criado_em: string;
};

type Vaga = {
  id: string;
  titulo: string;
};

type Historico = {
  id: string;
  resultado: string;
  feedback: string | null;
  data: string | null;
  recrutador: string | null;
  vaga_id: string | null;
};

export default function CandidatoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidato, setCandidato] = useState<Candidato | null>(null);
  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCandidato();
    loadHistorico();
  }, [id]);

  const loadCandidato = async () => {
    try {
      const { data, error } = await supabase
        .from("candidatos")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setCandidato(data);

      if (data.vaga_relacionada_id) {
        const { data: vagaData } = await supabase
          .from("vagas")
          .select("id, titulo")
          .eq("id", data.vaga_relacionada_id)
          .single();
        setVaga(vagaData);
      }
    } catch (error) {
      console.error("Erro ao carregar candidato:", error);
      toast.error("Erro ao carregar candidato");
    } finally {
      setLoading(false);
    }
  };

  const loadHistorico = async () => {
    try {
      const { data, error } = await supabase
        .from("historico_candidatos")
        .select("*")
        .eq("candidato_id", id)
        .order("data", { ascending: false });

      if (error) throw error;
      setHistorico(data || []);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("candidatos")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Candidato excluído com sucesso!");
      navigate("/candidatos");
    } catch (error) {
      console.error("Erro ao excluir candidato:", error);
      toast.error("Erro ao excluir candidato");
    }
  };

  const getStatusType = (status: string): "active" | "pending" | "cancelled" | "completed" => {
    if (status === "Contratado") return "completed";
    if (status.includes("Reprovado")) return "cancelled";
    if (status === "Banco de Talentos") return "pending";
    return "active";
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!candidato) {
    return (
      <div className="p-8">
        <p>Candidato não encontrado</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/candidatos")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/candidatos/${id}/editar`)}>
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
                  Tem certeza que deseja excluir este candidato? Esta ação não pode ser desfeita.
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
          <div className="mb-2 flex items-center gap-2">
            <h1 className="text-3xl font-bold">{candidato.nome_completo}</h1>
            <StatusBadge status={candidato.status} type={getStatusType(candidato.status)} />
          </div>
          <p className="text-xl text-muted-foreground">
            {candidato.nivel} - {candidato.area}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${candidato.email}`} className="text-info hover:underline">
                  {candidato.email}
                </a>
              </div>
              {candidato.telefone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${candidato.telefone}`} className="hover:underline">
                    {candidato.telefone}
                  </a>
                </div>
              )}
              {candidato.cidade && candidato.estado && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {candidato.cidade}, {candidato.estado}
                  </span>
                </div>
              )}
              {candidato.linkedin && (
                <div className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-muted-foreground" />
                  <a href={candidato.linkedin} target="_blank" rel="noopener noreferrer" className="text-info hover:underline">
                    LinkedIn
                  </a>
                </div>
              )}
              {candidato.curriculo_link && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <a href={candidato.curriculo_link} target="_blank" rel="noopener noreferrer" className="text-info hover:underline">
                    Ver Currículo
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações Profissionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Recrutador</p>
                <p className="font-medium">{candidato.recrutador || "Não atribuído"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pretensão Salarial</p>
                <p className="font-medium">{formatCurrency(candidato.pretensao_salarial)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vaga Relacionada</p>
                {vaga ? (
                  <Button
                    variant="link"
                    className="h-auto p-0 font-medium text-info"
                    onClick={() => navigate(`/vagas/${vaga.id}`)}
                  >
                    <Briefcase className="mr-1 h-4 w-4" />
                    {vaga.titulo}
                  </Button>
                ) : (
                  <p className="font-medium">Nenhuma vaga relacionada</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data de Cadastro</p>
                <p className="font-medium">{formatDate(candidato.criado_em)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {candidato.feedback && (
          <Card>
            <CardHeader>
              <CardTitle>Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{candidato.feedback}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            {historico.length === 0 ? (
              <p className="text-muted-foreground">Nenhum histórico registrado</p>
            ) : (
              <div className="space-y-4">
                {historico.map((item) => (
                  <div key={item.id} className="rounded-lg border p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium">{item.resultado}</span>
                      <span className="text-sm text-muted-foreground">{formatDate(item.data)}</span>
                    </div>
                    {item.recrutador && (
                      <p className="text-sm text-muted-foreground">Recrutador: {item.recrutador}</p>
                    )}
                    {item.feedback && (
                      <p className="mt-2 text-sm">{item.feedback}</p>
                    )}
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
