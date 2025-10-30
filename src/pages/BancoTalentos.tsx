import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, User, MapPin, Briefcase, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Candidato = {
  id: string;
  nome_completo: string;
  email: string;
  cidade: string | null;
  estado: string | null;
  nivel: string | null;
  area: string | null;
  recrutador: string | null;
  criado_em: string;
};

export default function BancoTalentos() {
  const navigate = useNavigate();
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [nivelFilter, setNivelFilter] = useState<string>("all");

  useEffect(() => {
    loadCandidatos();
  }, []);

  const loadCandidatos = async () => {
    try {
      const { data, error } = await supabase
        .from("candidatos")
        .select("*")
        .eq("status", "Banco de Talentos")
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setCandidatos(data || []);
    } catch (error) {
      console.error("Erro ao carregar banco de talentos:", error);
      toast.error("Erro ao carregar banco de talentos");
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidatos = candidatos.filter((candidato) => {
    const matchesSearch = candidato.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (candidato.email && candidato.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesArea = areaFilter === "all" || candidato.area === areaFilter;
    const matchesNivel = nivelFilter === "all" || candidato.nivel === nivelFilter;
    return matchesSearch && matchesArea && matchesNivel;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Banco de Talentos</h1>
        <p className="text-muted-foreground">
          {candidatos.length} candidatos disponíveis para realocação
        </p>
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
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as áreas</SelectItem>
            <SelectItem value="RH">RH</SelectItem>
            <SelectItem value="Vendas">Vendas</SelectItem>
            <SelectItem value="Financeiro">Financeiro</SelectItem>
            <SelectItem value="Marketing">Marketing</SelectItem>
            <SelectItem value="TI">TI</SelectItem>
            <SelectItem value="Operações">Operações</SelectItem>
          </SelectContent>
        </Select>
        <Select value={nivelFilter} onValueChange={setNivelFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Nível" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os níveis</SelectItem>
            <SelectItem value="Estagiário">Estagiário</SelectItem>
            <SelectItem value="Júnior">Júnior</SelectItem>
            <SelectItem value="Pleno">Pleno</SelectItem>
            <SelectItem value="Sênior">Sênior</SelectItem>
            <SelectItem value="Liderança">Liderança</SelectItem>
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
              <div className="mb-2 flex items-center gap-2">
                <div className="rounded-lg bg-warning/10 p-2">
                  <User className="h-5 w-5 text-warning" />
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Desde {formatDate(candidato.criado_em)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCandidatos.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Nenhum candidato encontrado no banco de talentos</p>
        </div>
      )}
    </div>
  );
}
