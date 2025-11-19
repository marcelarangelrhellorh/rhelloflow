import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Grid3x3, List, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { CandidateCard } from "@/components/BancoTalentos/CandidateCard";
import { CandidateProfileDrawer } from "@/components/BancoTalentos/CandidateProfileDrawer";
import { LinkToJobModal } from "@/components/BancoTalentos/LinkToJobModal";
import { ImportXlsModal } from "@/components/ImportXlsModal";
import { differenceInDays } from "date-fns";
interface Candidato {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  area: string | null;
  nivel: string | null;
  pretensao_salarial: number | null;
  linkedin: string | null;
  status: string;
  recrutador: string | null;
  recruiter_id: string | null;
  criado_em: string;
  curriculo_link: string | null;
  feedback: string | null;
  profiles?: {
    full_name: string;
  } | null;
  mediaRating?: number | null;
  qtdAvaliacoes?: number;
}
export default function BancoTalentos() {
  const navigate = useNavigate();
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const [avaliacaoFilter, setAvaliacaoFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [availableTags, setAvailableTags] = useState<Array<{
    label: string;
    value: string;
  }>>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidato | null>(null);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showLinkJobModal, setShowLinkJobModal] = useState(false);
  const [linkJobCandidateId, setLinkJobCandidateId] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  useEffect(() => {
    loadCandidatos();
    loadTags();
  }, []);
  const loadTags = async () => {
    try {
      const {
        data,
        error
      } = await (supabase as any).from("tags").select("id, label, category").eq("active", true).order("label");
      if (error) throw error;
      const tagOptions = (data || []).map((tag: any) => ({
        label: `${tag.label} (${tag.category})`,
        value: tag.id
      }));
      setAvailableTags(tagOptions);
    } catch (error: any) {
      console.error("Erro ao carregar tags:", error);
    }
  };
  const loadCandidatos = async () => {
    try {
      setLoading(true);

      // Buscar candidatos com suas tags usando a view
      const {
        data,
        error
      } = await (supabase as any).from("candidates_with_tags").select("*").eq("status", "Banco de Talentos").order("criado_em", {
        ascending: false
      });
      if (error) throw error;

      // Buscar estatísticas de avaliação para cada candidato
      const candidatosComRating = await Promise.all((data || []).map(async (candidato: any) => {
        const {
          data: ratings
        } = await supabase.from('feedbacks').select('avaliacao').eq('candidato_id', candidato.id);
        const avaliacoes = (ratings || []).map(f => f.avaliacao).filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
        const mediaRating = avaliacoes.length > 0 ? avaliacoes.reduce((a, b) => a + b, 0) / avaliacoes.length : null;
        return {
          ...candidato,
          mediaRating,
          qtdAvaliacoes: avaliacoes.length
        };
      }));
      setCandidatos(candidatosComRating as any);
    } catch (error: any) {
      console.error("Erro ao carregar banco de talentos:", error);
      toast.error("Erro ao carregar banco de talentos");
    } finally {
      setLoading(false);
    }
  };
  const filteredCandidatos = candidatos.filter(candidato => {
    // Filtro de busca por nome
    const matchesSearch = searchTerm === "" || 
      candidato.nome_completo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEstado = estadoFilter === "all" || candidato.estado === estadoFilter;

    // Filtro de avaliação
    let matchesAvaliacao = true;
    if (avaliacaoFilter !== "all") {
      const minRating = Number(avaliacaoFilter.replace("+", ""));
      matchesAvaliacao = (candidato.mediaRating ?? 0) >= minRating;
    }

    // Filtro de tags
    let matchesTags = true;
    if (tagFilter !== "all") {
      const candidateTags = (candidato as any).tags || [];
      matchesTags = candidateTags.some((ct: any) => ct.tag_id === tagFilter);
    }
    return matchesSearch && matchesEstado && matchesAvaliacao && matchesTags;
  });
  const getDaysInBank = (dateString: string) => {
    return differenceInDays(new Date(), new Date(dateString));
  };
  const hasActiveFilters = searchTerm !== "" || estadoFilter !== "all" || avaliacaoFilter !== "all" || tagFilter !== "all";
  const handleViewProfile = (candidato: Candidato) => {
    setSelectedCandidate(candidato);
    setShowProfileDrawer(true);
  };
  const handleLinkToJob = (candidatoId: string) => {
    setLinkJobCandidateId(candidatoId);
    setShowLinkJobModal(true);
  };
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>;
  }
  return <div className="min-h-screen p-8" style={{
    backgroundColor: '#FFFBF0'
  }}>
      {/* Cabeçalho */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Banco de Talentos</h1>
          <p className="text-base text-muted-foreground mb-2">
            Visualize e gerencie candidatos disponíveis para realocação.
          </p>
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-base text-foreground font-semibold">
              {filteredCandidatos.length} candidato{filteredCandidatos.length !== 1 ? "s" : ""} disponível{filteredCandidatos.length !== 1 ? "is" : ""} para realocação
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/candidatos/novo')} className="bg-[#F9EC3F] hover:bg-[#E5D72E] text-[#00141D] font-bold">
            <Plus className="mr-2 h-5 w-5" />
            Adicionar Candidato
          </Button>
          <Button onClick={() => setImportModalOpen(true)} variant="outline" className="font-bold text-[0#] text-slate-950 bg-[t#] bg-[#faec3e]">
            <Plus className="mr-2 h-5 w-5" />
            Importar Planilha XLS
          </Button>
        </div>
      </div>

      {/* Filtros e busca */}
      <div className="sticky top-20 z-10 bg-background/95 backdrop-blur-sm pb-6 mb-6 border-b">
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={avaliacaoFilter} onValueChange={setAvaliacaoFilter}>
            <SelectTrigger className={`w-[200px] ${avaliacaoFilter !== 'all' ? 'border-2 border-primary' : ''}`}>
              <SelectValue placeholder="Avaliação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer avaliação</SelectItem>
              <SelectItem value="5">⭐⭐⭐⭐⭐ 5 estrelas</SelectItem>
              <SelectItem value="4+">⭐⭐⭐⭐ 4+ estrelas</SelectItem>
              <SelectItem value="3+">⭐⭐⭐ 3+ estrelas</SelectItem>
              <SelectItem value="2+">⭐⭐ 2+ estrelas</SelectItem>
              <SelectItem value="1+">⭐ 1+ estrela</SelectItem>
            </SelectContent>
          </Select>

          <Select value={estadoFilter} onValueChange={setEstadoFilter}>
            <SelectTrigger className={`w-[180px] ${estadoFilter !== '' && estadoFilter !== 'all' ? 'border-2 border-primary' : ''}`}>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="all">Todos os estados</SelectItem>
              <SelectItem value="AC">AC - Acre</SelectItem>
              <SelectItem value="AL">AL - Alagoas</SelectItem>
              <SelectItem value="AP">AP - Amapá</SelectItem>
              <SelectItem value="AM">AM - Amazonas</SelectItem>
              <SelectItem value="BA">BA - Bahia</SelectItem>
              <SelectItem value="CE">CE - Ceará</SelectItem>
              <SelectItem value="DF">DF - Distrito Federal</SelectItem>
              <SelectItem value="ES">ES - Espírito Santo</SelectItem>
              <SelectItem value="GO">GO - Goiás</SelectItem>
              <SelectItem value="MA">MA - Maranhão</SelectItem>
              <SelectItem value="MT">MT - Mato Grosso</SelectItem>
              <SelectItem value="MS">MS - Mato Grosso do Sul</SelectItem>
              <SelectItem value="MG">MG - Minas Gerais</SelectItem>
              <SelectItem value="PA">PA - Pará</SelectItem>
              <SelectItem value="PB">PB - Paraíba</SelectItem>
              <SelectItem value="PR">PR - Paraná</SelectItem>
              <SelectItem value="PE">PE - Pernambuco</SelectItem>
              <SelectItem value="PI">PI - Piauí</SelectItem>
              <SelectItem value="RJ">RJ - Rio de Janeiro</SelectItem>
              <SelectItem value="RN">RN - Rio Grande do Norte</SelectItem>
              <SelectItem value="RS">RS - Rio Grande do Sul</SelectItem>
              <SelectItem value="RO">RO - Rondônia</SelectItem>
              <SelectItem value="RR">RR - Roraima</SelectItem>
              <SelectItem value="SC">SC - Santa Catarina</SelectItem>
              <SelectItem value="SP">SP - São Paulo</SelectItem>
              <SelectItem value="SE">SE - Sergipe</SelectItem>
              <SelectItem value="TO">TO - Tocantins</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className={`w-[250px] ${tagFilter !== 'all' ? 'border-2 border-primary' : ''}`}>
              <SelectValue placeholder="Filtrar por tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as tags</SelectItem>
              {availableTags.map(tag => <SelectItem key={tag.value} value={tag.value}>
                  {tag.label}
                </SelectItem>)}
            </SelectContent>
          </Select>

          <div className="flex gap-2 ml-auto">
            <Button variant={viewMode === "grid" ? "default" : "outline"} size="icon" onClick={() => setViewMode("grid")} className={viewMode === "grid" ? "bg-[#F9EC3F] text-[#00141D] hover:bg-[#E5D72E]" : ""}>
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")} className={viewMode === "list" ? "bg-[#F9EC3F] text-[#00141D] hover:bg-[#E5D72E]" : ""}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {hasActiveFilters && <div className="flex items-center justify-between">
            <p className="text-base text-muted-foreground">
              {filteredCandidatos.length} resultado{filteredCandidatos.length !== 1 ? "s" : ""} encontrado{filteredCandidatos.length !== 1 ? "s" : ""}
            </p>
            <Button variant="ghost" size="sm" onClick={() => {
          setSearchTerm("");
          setEstadoFilter("all");
          setAvaliacaoFilter("all");
          setTagFilter("all");
        }} className="text-muted-foreground hover:text-foreground">
              Limpar filtros
            </Button>
          </div>}
      </div>

      {/* Cards de candidatos */}
      {filteredCandidatos.length === 0 ? <div className="flex flex-col items-center justify-center py-20 text-center">
          
          <h3 className="text-3xl font-bold text-foreground mb-2">
            Nenhum talento disponível no momento
          </h3>
          <p className="text-base text-muted-foreground mb-6">
            Cadastre novos ou acompanhe os processos em andamento.
          </p>
          <Button onClick={() => navigate('/candidatos/novo')} className="bg-[#F9EC3F] hover:bg-[#E5D72E] text-[#00141D] font-bold">
            <Plus className="mr-2 h-5 w-5" />
            Adicionar Primeiro Candidato
          </Button>
        </div> : <div className={viewMode === "grid" ? "grid gap-6 md:grid-cols-2" : "space-y-4"}>
          {filteredCandidatos.map(candidato => <CandidateCard key={candidato.id} candidate={{
        ...candidato,
        recruiter_name: candidato.profiles?.full_name || candidato.recrutador || "Não atribuído",
        days_in_bank: getDaysInBank(candidato.criado_em)
      }} onViewProfile={() => handleViewProfile(candidato)} onLinkToJob={() => handleLinkToJob(candidato.id)} viewMode={viewMode} />)}
        </div>}

      {/* Modals */}
      {selectedCandidate && <CandidateProfileDrawer open={showProfileDrawer} onOpenChange={setShowProfileDrawer} candidate={{
      ...selectedCandidate,
      recruiter_name: selectedCandidate.profiles?.full_name || selectedCandidate.recrutador || "Não atribuído",
      days_in_bank: getDaysInBank(selectedCandidate.criado_em)
    }} />}

      {linkJobCandidateId && <LinkToJobModal open={showLinkJobModal} onOpenChange={setShowLinkJobModal} candidateId={linkJobCandidateId} onSuccess={() => {
      loadCandidatos();
      setShowLinkJobModal(false);
      setLinkJobCandidateId(null);
    }} />}

      <ImportXlsModal open={importModalOpen} onOpenChange={setImportModalOpen} sourceType="banco_talentos" onSuccess={() => {
      loadCandidatos();
    }} />
    </div>;
}