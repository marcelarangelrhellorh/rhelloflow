import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, DollarSign, Calendar, ExternalLink, FileText, MapPin, CheckCircle2, XCircle, Mail, Phone, Linkedin, Copy, Link2 } from "lucide-react";
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
  // Contact props
  email: string;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  linkedin: string | null;
  curriculoLink: string | null;
  isFromPublicLink?: boolean;
  // Professional props
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
  modeloContratacao?: string | null;
  formatoTrabalho?: string | null;
  onUpdate?: () => void;
  onVagaClick?: () => void;
}
export function ProfessionalInfoCard({
  // Contact
  email,
  telefone,
  cidade,
  estado,
  linkedin,
  curriculoLink,
  isFromPublicLink = false,
  // Professional
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
  modeloContratacao,
  formatoTrabalho,
  onUpdate,
  onVagaClick
}: ProfessionalInfoCardProps) {
  const handleCopyContact = () => {
    const contactText = `
E-mail: ${email}
Telefone: ${telefone || "Não informado"}
Localização: ${[cidade, estado].filter(Boolean).join(", ") || "Não informada"}
    `.trim();
    navigator.clipboard.writeText(contactText);
    toast.success("Contato copiado para a área de transferência");
  };

  const openWhatsApp = () => {
    if (!telefone) return;
    const cleanPhone = telefone.replace(/\D/g, "");
    window.open(`https://wa.me/55${cleanPhone}`, "_blank");
  };

  const openMaps = () => {
    if (!cidade || !estado) return;
    const query = encodeURIComponent(`${cidade}, ${estado}, Brasil`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };
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
      {/* Contact Section */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Contato</CardTitle>
            {isFromPublicLink && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs bg-info/10 text-info border-info/20">
                <Link2 className="h-3 w-3" />
                Link Público
              </Badge>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleCopyContact} className="h-8 text-xs font-semibold border-gray-200 dark:border-secondary-text-light/20">
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copiar
          </Button>
        </div>
        {isFromPublicLink && (
          <p className="text-sm text-muted-foreground mt-1">
            Informações enviadas pelo candidato
          </p>
        )}
      </CardHeader>
      
      <CardContent className="pt-2 pb-4 space-y-1">
        {/* Email */}
        <div className="flex items-center justify-between group hover:bg-primary/5 dark:hover:bg-primary/10 -mx-2 px-2 py-2 rounded transition-colors">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-base text-card-foreground truncate">{email}</span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" asChild>
            <a href={`mailto:${email}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>

        {/* Phone */}
        {telefone && (
          <div className="flex items-center justify-between group hover:bg-primary/5 dark:hover:bg-primary/10 -mx-2 px-2 py-2 rounded transition-colors">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-card-foreground">{telefone}</span>
            </div>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={openWhatsApp}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Location */}
        {(cidade || estado) && (
          <div className="flex items-center justify-between group hover:bg-primary/5 dark:hover:bg-primary/10 -mx-2 px-2 py-2 rounded transition-colors">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-card-foreground">{[cidade, estado].filter(Boolean).join(", ")}</span>
            </div>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={openMaps}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* LinkedIn */}
        {linkedin && (
          <div className="flex items-center justify-between group hover:bg-primary/5 dark:hover:bg-primary/10 -mx-2 px-2 py-2 rounded transition-colors">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Linkedin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-info font-medium">LinkedIn</span>
            </div>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" asChild>
              <a href={linkedin} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        )}

        {/* Curriculum from public link */}
        {curriculoLink && (
          <div className="flex items-center justify-between group hover:bg-primary/5 dark:hover:bg-primary/10 -mx-2 px-2 py-2 rounded transition-colors">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-info font-medium">Ver Currículo</span>
            </div>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" asChild>
              <a href={curriculoLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        )}
      </CardContent>

      <Separator />

      {/* Professional Info Section */}
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-base">Informações Profissionais</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 shadow-md border-[#ffcd00]">
        {/* Grid Layout */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Pretensão Salarial */}
          <div>
            <p className="text-muted-foreground mb-1 flex items-center gap-1 font-semibold text-base">
              <DollarSign className="h-3.5 w-3.5 text-gray-800" />
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