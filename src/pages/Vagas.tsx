import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Briefcase, User, Calendar, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Vaga = {
  id: string;
  titulo: string;
  empresa: string;
  recrutador: string | null;
  cs_responsavel: string | null;
  status: string;
  complexidade: string | null;
  prioridade: string | null;
  criado_em: string;
};

export default function Vagas() {
  const navigate = useNavigate();
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadVagas();
  }, []);

  const loadVagas = async () => {
    try {
      const { data, error } = await supabase
        .from("vagas")
        .select("*")
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setVagas(data || []);
    } catch (error) {
      console.error("Erro ao carregar vagas:", error);
      toast.error("Erro ao carregar vagas");
    } finally {
      setLoading(false);
    }
  };

  const filteredVagas = vagas.filter((vaga) => {
    const matchesSearch = vaga.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vaga.empresa.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || vaga.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getDaysOpen = (criadoEm: string) => {
    const today = new Date();
    const created = new Date(criadoEm);
    const diffTime = Math.abs(today.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusType = (status: string): "active" | "pending" | "cancelled" | "completed" => {
    if (status === "Concluído") return "completed";
    if (status === "Cancelada") return "cancelled";
    if (status === "A iniciar" || status === "Discovery") return "pending";
    return "active";
  };

  const getPriorityColor = (prioridade: string | null) => {
    switch (prioridade) {
      case "Crítica": return "text-destructive";
      case "Alta": return "text-warning";
      case "Normal": return "text-info";
      default: return "text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vagas</h1>
          <p className="text-muted-foreground">Gerencie todas as vagas abertas</p>
        </div>
        <Button onClick={() => navigate("/vagas/nova")}>
          <Plus className="mr-2 h-5 w-5" />
          Nova Vaga
        </Button>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar vagas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="A iniciar">A iniciar</SelectItem>
            <SelectItem value="Discovery">Discovery</SelectItem>
            <SelectItem value="Triagem">Triagem</SelectItem>
            <SelectItem value="Entrevistas Rhello">Entrevistas Rhello</SelectItem>
            <SelectItem value="Concluído">Concluído</SelectItem>
            <SelectItem value="Cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredVagas.map((vaga) => (
          <Card
            key={vaga.id}
            className="cursor-pointer transition-shadow hover:shadow-lg"
            onClick={() => navigate(`/vagas/${vaga.id}`)}
          >
            <CardHeader>
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <StatusBadge status={vaga.status} type={getStatusType(vaga.status)} />
                </div>
                <span className={`text-sm font-medium ${getPriorityColor(vaga.prioridade)}`}>
                  {vaga.prioridade}
                </span>
              </div>
              <CardTitle className="text-lg">{vaga.titulo}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                {vaga.empresa}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                {vaga.recrutador || "Não atribuído"}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {getDaysOpen(vaga.criado_em)} dias em aberto
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVagas.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Nenhuma vaga encontrada</p>
        </div>
      )}
    </div>
  );
}
