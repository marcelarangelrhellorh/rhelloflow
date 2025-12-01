import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, DollarSign, Calendar, ExternalLink, FileText, MapPin, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
const ORIGENS = [{
  value: "Link de Divulgação",
  label: "🔗 Link de Divulgação"
}, {
  value: "Pandapé",
  label: "🐼 Pandapé"
}, {
  value: "LinkedIn",
  label: "💼 LinkedIn"
}, {
  value: "Gupy",
  label: "🎯 Gupy"
}, {
  value: "Indeed",
  label: "📋 Indeed"
}, {
  value: "Catho",
  label: "📊 Catho"
}, {
  value: "Indicação",
  label: "👥 Indicação"
}, {
  value: "Site da Empresa",
  label: "🌐 Site da Empresa"
}, {
  value: "Instagram",
  label: "📸 Instagram"
}, {
  value: "WhatsApp",
  label: "💬 WhatsApp"
}, {
  value: "E-mail Direto",
  label: "✉️ E-mail Direto"
}, {
  value: "Hunting",
  label: "🎯 Hunting"
}, {
  value: "Outra",
  label: "➕ Outra"
}];
interface Vaga {
  id: string;
  titulo: string;
  empresa: string;
}
interface ProfessionalInfoCardProps {
  pretensaoSalarial: number | null;
  vagaTitulo: string | null;
  vagaId: string | null;
  dataCadastro: string;
  nivel: string | null;
  area: string | null;
  curriculoUrl: string | null;
  portfolioUrl: string | null;
  disponibilidadeMudanca: string | null;
  disponibilidadeStatus: string | null;
  pontosFortes: string | null;
  pontosDesenvolver: string | null;
  parecerFinal: string | null;
  origem: string | null;
  candidatoId: string;
  experienciaProfissional: string | null;
  idiomas: string | null;
  onUpdate?: () => void;
  onVagaClick?: () => void;
}
export function ProfessionalInfoCard({
  pretensaoSalarial,
  vagaTitulo,
  vagaId,
  dataCadastro,
  nivel,
  area,
  curriculoUrl,
  portfolioUrl,
  disponibilidadeMudanca,
  disponibilidadeStatus,
  pontosFortes,
  pontosDesenvolver,
  parecerFinal,
  origem,
  candidatoId,
  experienciaProfissional,
  idiomas,
  onUpdate,
  onVagaClick
}: ProfessionalInfoCardProps) {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loadingVagas, setLoadingVagas] = useState(false);
  useEffect(() => {
    loadVagas();
  }, []);
  const loadVagas = async () => {
    setLoadingVagas(true);
    try {
      const {
        data,
        error
      } = await supabase.from("vagas").select("id, titulo, empresa").neq("status", "Concluído").neq("status", "Cancelada").order("titulo");
      if (error) throw error;
      setVagas(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar vagas:", error);
    } finally {
      setLoadingVagas(false);
    }
  };
  const formatCurrency = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  };
  const handleDownload = async (url: string, fileName: string) => {
    try {
      // Open URL in new tab for public files
      window.open(url, '_blank');
      toast.success("Abrindo arquivo");
    } catch (error) {
      console.error("Erro ao abrir arquivo:", error);
      toast.error("Erro ao abrir arquivo");
    }
  };
  const handleDisponibilidadeChange = async (newDisponibilidade: string) => {
    try {
      const {
        error
      } = await supabase.from("candidatos").update({
        disponibilidade_status: newDisponibilidade
      }).eq("id", candidatoId);
      if (error) throw error;
      toast.success("Disponibilidade atualizada com sucesso!");
      onUpdate?.();
    } catch (error) {
      console.error("Erro ao atualizar disponibilidade:", error);
      toast.error("Erro ao atualizar disponibilidade");
    }
  };
  const handleOrigemChange = async (newOrigem: string) => {
    try {
      const {
        error
      } = await supabase.from("candidatos").update({
        origem: newOrigem
      }).eq("id", candidatoId);
      if (error) throw error;
      toast.success("Origem atualizada com sucesso!");
      onUpdate?.();
    } catch (error) {
      console.error("Erro ao atualizar origem:", error);
      toast.error("Erro ao atualizar origem");
    }
  };
  const handleVagaChange = async (newVagaId: string) => {
    try {
      const vagaIdToSet = newVagaId === "none" ? null : newVagaId;
      const {
        error
      } = await supabase.from("candidatos").update({
        vaga_relacionada_id: vagaIdToSet,
        status: vagaIdToSet ? "Selecionado" : "Banco de Talentos"
      }).eq("id", candidatoId);
      if (error) throw error;
      toast.success("Vaga relacionada atualizada!");
      onUpdate?.();
    } catch (error: any) {
      console.error("Erro ao atualizar vaga:", error);
      toast.error("Erro ao atualizar vaga relacionada");
    }
  };
  return <Card className="border border-gray-300 shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">Informações Profissionais</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 shadow-md border-[#ffcd00]">
        {/* Grid Layout */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Pretensão Salarial */}
          <div>
            <p className="text-muted-foreground mb-1 flex items-center gap-1 font-semibold text-base">
              <DollarSign className="h-3.5 w-3.5" />
              Pretensão Salarial
            </p>
            <p className="text-base font-semibold text-card-foreground">
              {formatCurrency(pretensaoSalarial)}
            </p>
          </div>

          {/* Nível */}
          {nivel && <div>
              <p className="text-sm text-muted-foreground mb-1">Nível</p>
              <p className="text-base font-medium text-card-foreground">{nivel}</p>
            </div>}

          {/* Nível */}
          {nivel && <div>
              <p className="text-sm text-muted-foreground mb-1">Nível</p>
              <p className="text-base font-medium text-card-foreground capitalize">{nivel}</p>
            </div>}

          {/* Área */}
          {area && <div>
              <p className="text-sm text-muted-foreground mb-1">Área</p>
              <p className="text-base font-medium text-card-foreground">{area}</p>
            </div>}

          {/* Experiência Profissional */}
          {experienciaProfissional && <div className="sm:col-span-2">
              <p className="text-muted-foreground mb-1 flex items-center gap-1 text-base font-semibold">
                <Briefcase className="h-3.5 w-3.5" />
                Experiência Profissional
              </p>
              <p className="text-base text-card-foreground whitespace-pre-wrap">{experienciaProfissional}</p>
            </div>}

          {/* Idiomas */}
          {idiomas && <div className="sm:col-span-2">
              <p className="text-muted-foreground mb-1 text-base font-semibold">Idiomas</p>
              <p className="text-base text-card-foreground">{idiomas}</p>
            </div>}

          {/* Disponibilidade do candidato - Editável */}
          <div className="sm:col-span-2">
            <p className="text-muted-foreground mb-2 flex items-center gap-1 font-semibold text-base">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Disponibilidade do Candidato
            </p>
            <Select value={disponibilidadeStatus || "disponível"} onValueChange={handleDisponibilidadeChange}>
              <SelectTrigger className="w-full sm:w-64 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="disponível">✅ Disponível</SelectItem>
                <SelectItem value="não_disponível">❌ Não disponível</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Disponibilidade para mudança */}
          <div className="sm:col-span-2">
            <p className="text-muted-foreground mb-1 flex items-center gap-1 font-semibold text-base">
              <MapPin className="h-3.5 w-3.5" />
              Disponibilidade para Mudança
            </p>
            <div className="flex items-center gap-2">
              {disponibilidadeMudanca === "Sim" ? <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-base font-medium text-green-600">Sim</span>
                </> : disponibilidadeMudanca === "Não" ? <>
                  <XCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-base font-medium text-orange-600">Não</span>
                </> : disponibilidadeMudanca === "A combinar" ? <>
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  <span className="text-base font-medium text-blue-600">A combinar</span>
                </> : <>
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-base font-medium text-muted-foreground">Não informado</span>
                </>}
            </div>
          </div>

          {/* Data de Cadastro */}
          <div className="sm:col-span-2">
            <p className="text-muted-foreground mb-1 flex items-center gap-1 font-semibold text-base">
              <Calendar className="h-3.5 w-3.5" />
              Data de Cadastro
            </p>
            <p className="text-base font-medium text-card-foreground">{formatDate(dataCadastro)}</p>
          </div>

          {/* Origem - Editável */}
          <div className="sm:col-span-2">
            <p className="text-muted-foreground mb-2 flex items-center gap-1.5 font-semibold text-base">
              <ExternalLink className="h-4 w-4" />
              Origem do Candidato
            </p>
            <Select value={origem || ""} onValueChange={handleOrigemChange}>
              <SelectTrigger className="w-full sm:w-64 bg-background">
                <SelectValue placeholder="Selecione a origem" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {ORIGENS.map(org => <SelectItem key={org.value} value={org.value}>{org.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Documentos */}
        <div>
          <p className="mb-3 flex items-center gap-1 font-semibold text-base">
            <FileText className="h-4 w-4" />
            Documentos Anexados
          </p>
          <div className="space-y-2">
            {curriculoUrl && <Button variant="outline" size="sm" className="w-full justify-between" onClick={() => handleDownload(curriculoUrl, 'curriculo.pdf')}>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Ver Currículo</span>
                </div>
                <ExternalLink className="h-4 w-4" />
              </Button>}
            {portfolioUrl && <Button variant="outline" size="sm" className="w-full justify-between" onClick={() => handleDownload(portfolioUrl, 'portfolio.pdf')}>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Ver Portfólio</span>
                </div>
                <ExternalLink className="h-4 w-4" />
              </Button>}
            {!curriculoUrl && !portfolioUrl && <p className="text-sm text-muted-foreground italic">Nenhum documento anexado</p>}
          </div>
        </div>

        <Separator />

        {/* Vaga Relacionada - Editável */}
        <div>
          <p className="text-muted-foreground mb-2 flex items-center gap-1 font-semibold text-base">
            <Briefcase className="h-3.5 w-3.5" />
            Vaga Relacionada
          </p>
          <div className="flex gap-2">
            <Select value={vagaId || "none"} onValueChange={handleVagaChange} disabled={loadingVagas}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Selecione uma vaga" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="none">Nenhuma vaga</SelectItem>
                {vagas.map(vaga => <SelectItem key={vaga.id} value={vaga.id}>
                    {vaga.titulo} - {vaga.empresa}
                  </SelectItem>)}
              </SelectContent>
            </Select>
            {vagaId && <Button variant="outline" size="sm" onClick={onVagaClick} className="flex-shrink-0">
                <ExternalLink className="h-4 w-4" />
              </Button>}
          </div>
        </div>

        {/* Avaliação */}
        {(pontosFortes || pontosDesenvolver || parecerFinal) && <>
            <Separator />
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Avaliação</h4>
              
              {pontosFortes && <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Pontos Fortes</p>
                  <p className="text-sm text-card-foreground whitespace-pre-wrap">{pontosFortes}</p>
                </div>}

              {pontosDesenvolver && <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Pontos a Desenvolver</p>
                  <p className="text-sm text-card-foreground whitespace-pre-wrap">{pontosDesenvolver}</p>
                </div>}

              {parecerFinal && <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Parecer Final</p>
                  <p className="text-sm text-card-foreground whitespace-pre-wrap">{parecerFinal}</p>
                </div>}
            </div>
          </>}
      </CardContent>
    </Card>;
}