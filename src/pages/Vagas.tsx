import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Link2, Copy, AlertTriangle, ExternalLink, Grid3x3, List } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { VagaCard } from "@/components/VagaCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

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
  candidatos_count?: number;
};

type StatusRef = {
  slug: string;
  label: string;
  color: string;
  order: number;
};

export default function Vagas() {
  const navigate = useNavigate();
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [statusOptions, setStatusOptions] = useState<StatusRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [recrutadorFilter, setRecrutadorFilter] = useState<string>("all");
  const [clienteFilter, setClienteFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // Verificar se há filtro de atenção pela URL
  const searchParams = new URLSearchParams(window.location.search);
  const attentionFilter = searchParams.get('attention');
  const attentionIds = searchParams.get('ids')?.split(',') || [];

  useEffect(() => {
    loadStatusOptions();
    loadVagas();
  }, []);

  const loadStatusOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("vaga_status_ref")
        .select("slug, label, color, order")
        .order("order");

      if (error) throw error;
      setStatusOptions(data || []);
    } catch (error) {
      console.error("Erro ao carregar status:", error);
    }
  };

  const loadVagas = async () => {
    try {
      const { data: vagasData, error: vagasError } = await supabase
        .from("vagas")
        .select(`
          *,
          recrutador_user:users!vagas_recrutador_id_fkey(name),
          cs_user:users!vagas_cs_id_fkey(name)
        `)
        .is("deleted_at", null)
        .order("criado_em", { ascending: false });

      if (vagasError) throw vagasError;

      // Load candidate counts for each vaga
      const vagasWithCounts = await Promise.all(
        (vagasData || []).map(async (vaga) => {
          const { count } = await supabase
            .from("candidatos")
            .select("*", { count: "exact", head: true })
            .eq("vaga_relacionada_id", vaga.id);
          
          // Mesclar nome do recrutador e CS do JOIN
          return { 
            ...vaga, 
            candidatos_count: count || 0,
            recrutador: vaga.recrutador_user?.name || vaga.recrutador || null,
            cs_responsavel: vaga.cs_user?.name || vaga.cs_responsavel || null
          };
        })
      );

      setVagas(vagasWithCounts);
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
    const matchesRecrutador = recrutadorFilter === "all" || vaga.recrutador === recrutadorFilter;
    const matchesCliente = clienteFilter === "all" || vaga.empresa === clienteFilter;
    const matchesAttention = attentionFilter !== 'out_of_sla' || attentionIds.includes(vaga.id);
    return matchesSearch && matchesStatus && matchesRecrutador && matchesCliente && matchesAttention;
  });

  const recrutadores = Array.from(new Set(vagas.map(v => v.recrutador).filter(Boolean))) as string[];
  const clientes = Array.from(new Set(vagas.map(v => v.empresa).filter(Boolean))) as string[];
  
  const hasActiveFilter = attentionFilter === 'out_of_sla';
  
  const clearAttentionFilter = () => {
    navigate('/vagas');
    window.location.reload();
  };

  const copyPublicFormLink = () => {
    const publicLink = `${window.location.origin}/solicitar-vaga`;
    navigator.clipboard.writeText(publicLink);
    toast.success("Link copiado! Compartilhe com seus clientes.", {
      description: publicLink,
    });
  };

  const openPublicForm = () => {
    window.open("/solicitar-vaga", "_blank");
  };



  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#FFFBF0' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen" style={{ backgroundColor: '#FFFBF0' }}>
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vagas</h1>
          <p className="text-base text-muted-foreground">Gerencie todas as vagas abertas</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Link2 className="mr-2 h-4 w-4" />
                Formulário Público
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Compartilhar com Cliente</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={copyPublicFormLink}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openPublicForm}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir em Nova Aba
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button onClick={() => navigate("/vagas/nova")}>
            <Plus className="mr-2 h-5 w-5" />
            Nova Vaga
          </Button>
        </div>
      </div>

      {/* Filter chip */}
      {hasActiveFilter && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span className="text-base font-medium">
            Atenção: Fora do prazo (&gt;30 dias úteis)
          </span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={clearAttentionFilter}
            className="ml-auto"
          >
            Limpar
          </Button>
        </div>
      )}

      <div className="mb-6 flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[250px]">
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
            {statusOptions.map((status) => (
              <SelectItem key={status.slug} value={status.label}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={recrutadorFilter} onValueChange={setRecrutadorFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Recrutador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos recrutadores</SelectItem>
            {recrutadores.map((rec) => (
              <SelectItem key={rec} value={rec}>
                {rec}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={clienteFilter} onValueChange={setClienteFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos clientes</SelectItem>
            {clientes.map((cli) => (
              <SelectItem key={cli} value={cli}>
                {cli}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
            className={viewMode === "grid" ? "bg-[#F9EC3F] text-[#00141D] hover:bg-[#E5D72E]" : ""}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
            className={viewMode === "list" ? "bg-[#F9EC3F] text-[#00141D] hover:bg-[#E5D72E]" : ""}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className={viewMode === "grid" ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" : "space-y-4"}>
        {filteredVagas.map((vaga) => (
          <VagaCard key={vaga.id} vaga={vaga} viewMode={viewMode} />
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
