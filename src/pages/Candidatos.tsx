import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, User, MapPin, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Candidato = {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  nivel: string | null;
  area: string | null;
  status: string;
  recrutador: string | null;
  vaga_relacionada_id: string | null;
};

export default function Candidatos() {
  const navigate = useNavigate();
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadCandidatos();
  }, []);

  const loadCandidatos = async () => {
    try {
      const { data, error } = await supabase
        .from("candidatos")
        .select("*")
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setCandidatos(data || []);
    } catch (error) {
      console.error("Erro ao carregar candidatos:", error);
      toast.error("Erro ao carregar candidatos");
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidatos = candidatos.filter((candidato) => {
    const matchesSearch = candidato.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidato.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || candidato.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusType = (status: string): "active" | "pending" | "cancelled" | "completed" => {
    if (status === "Contratado") return "completed";
    if (status.includes("Reprovado")) return "cancelled";
    if (status === "Banco de Talentos") return "pending";
    return "active";
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
          <h1 className="text-3xl font-bold text-foreground">Candidatos</h1>
          <p className="text-muted-foreground">Gerencie todos os candidatos</p>
        </div>
        <Button onClick={() => navigate("/candidatos/novo")}>
          <Plus className="mr-2 h-5 w-5" />
          Novo Candidato
        </Button>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar candidatos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="Banco de Talentos">Banco de Talentos</SelectItem>
            <SelectItem value="Triado para a vaga">Triado para a vaga</SelectItem>
            <SelectItem value="Entrevista rhello">Entrevista Rhello</SelectItem>
            <SelectItem value="Aprovado rhello">Aprovado Rhello</SelectItem>
            <SelectItem value="Contratado">Contratado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredCandidatos.map((candidato) => (
          <Card
            key={candidato.id}
            className="cursor-pointer transition-shadow hover:shadow-lg"
            onClick={() => navigate(`/candidatos/${candidato.id}`)}
          >
            <CardHeader>
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-info/10 p-2">
                    <User className="h-5 w-5 text-info" />
                  </div>
                  <StatusBadge status={candidato.status} type={getStatusType(candidato.status)} />
                </div>
              </div>
              <CardTitle className="text-lg">{candidato.nome_completo}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                {candidato.nivel} - {candidato.area}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {candidato.cidade}, {candidato.estado}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                {candidato.recrutador || "Não atribuído"}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCandidatos.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Nenhum candidato encontrado</p>
        </div>
      )}
    </div>
  );
}
