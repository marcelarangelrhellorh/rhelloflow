import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileDown, CheckCircle, XCircle, Lightbulb, Info, Database, RefreshCw, Zap, ExternalLink, Globe, DollarSign, TrendingUp, X, Plus, Tags, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import logoRhelloDark from "@/assets/logo-rhello-dark.png";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import haysData from "@/data/salary-guides/hays_standardized.json";
import michaelPageData from "@/data/salary-guides/michael_page_standardized.json";
import { logger } from "@/lib/logger";
import { generateEstudoMercadoPdf } from "@/components/EstudoMercado/EstudoMercadoPdfExport";
import { useRolesSynonyms } from "@/hooks/useRolesSynonyms";

// Interfaces para o schema com segmentação por setor
interface FaixaPorPorte {
  min: string | null;
  media: string | null;
  max: string | null;
}

interface ResultadoSetor {
  setor: string;
  por_porte: {
    peq_med: FaixaPorPorte | null;
    grande: FaixaPorPorte | null;
  };
  registros_base: number;
  trecho_consultado?: string;
}

interface ResultadoFonte {
  encontrado: boolean;
  setores: ResultadoSetor[];
  observacao: string;
  fonte: string;
}

interface InfoJobsResultado {
  encontrado: boolean;
  salario_medio: string | null;
  faixa: {
    min: string | null;
    max: string | null;
  };
  registros_base: number | null;
  fonte: string;
  url: string | null;
}

interface GlassdoorResultado {
  encontrado: boolean;
  salario_medio: string | null;
  faixa: {
    min: string | null;
    max: string | null;
  };
  remuneracao_variavel: {
    media: string | null;
    min: string | null;
    max: string | null;
  } | null;
  registros_base: number | null;
  ultima_atualizacao: string | null;
  fonte: string;
  url: string | null;
}

interface EstudoMercadoNovo {
  consulta: {
    cargo_pedido: string;
    senioridade: string;
    localidade: string;
  };
  resultado: {
    hays: ResultadoFonte;
    michael_page: ResultadoFonte;
    infojobs?: InfoJobsResultado;
    glassdoor?: GlassdoorResultado;
  };
  consultoria: string[];
}

export default function EstudoMercado() {
  const [loading, setLoading] = useState(false);
  const [estudo, setEstudo] = useState<EstudoMercadoNovo | null>(null);
  const [importing, setImporting] = useState(false);
  const [benchmarkCount, setBenchmarkCount] = useState<number | null>(null);
  const [checkingData, setCheckingData] = useState(true);

  // Form state
  const [cargo, setCargo] = useState("");
  const [senioridade, setSenioridade] = useState("");
  const [localidade, setLocalidade] = useState("");
  const [forceRefresh, setForceRefresh] = useState(false);
  
  // Synonyms state
  const [sinonimos, setSinonimos] = useState<string[]>([]);
  const [novoSinonimo, setNovoSinonimo] = useState("");
  const [showSynonyms, setShowSynonyms] = useState(false);
  
  const { getSynonymsForRole } = useRolesSynonyms();

  // Auto-load synonyms when cargo changes
  useEffect(() => {
    if (cargo.trim()) {
      const catalogSynonyms = getSynonymsForRole(cargo);
      if (catalogSynonyms.length > 0) {
        setSinonimos(catalogSynonyms);
        setShowSynonyms(true);
      } else {
        setSinonimos([]);
      }
    } else {
      setSinonimos([]);
      setShowSynonyms(false);
    }
  }, [cargo, getSynonymsForRole]);

  const handleAddSinonimo = () => {
    const term = novoSinonimo.trim();
    if (term && !sinonimos.includes(term) && term.toLowerCase() !== cargo.toLowerCase()) {
      setSinonimos(prev => [...prev, term]);
      setNovoSinonimo("");
    }
  };

  const handleRemoveSinonimo = (index: number) => {
    setSinonimos(prev => prev.filter((_, i) => i !== index));
  };

  // Verificar se já existem dados importados
  useEffect(() => {
    const checkBenchmarks = async () => {
      try {
        const { count, error } = await supabase
          .from('salary_benchmarks')
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          setBenchmarkCount(count || 0);
        }
      } catch (e) {
        logger.error('Erro ao verificar benchmarks:', e);
      } finally {
        setCheckingData(false);
      }
    };
    checkBenchmarks();
  }, []);

  // Importar dados de salário
  const handleImportData = async () => {
    setImporting(true);
    try {
      // Importar Hays
      const { data: haysResult, error: haysError } = await supabase.functions.invoke('import-salary-data', {
        body: {
          source: 'hays',
          data: haysData,
          clear_existing: true
        }
      });
      
      if (haysError) throw haysError;
      logger.log('Hays importado:', haysResult);

      // Importar Michael Page
      const { data: mpResult, error: mpError } = await supabase.functions.invoke('import-salary-data', {
        body: {
          source: 'michael_page',
          data: michaelPageData,
          clear_existing: true
        }
      });
      
      if (mpError) throw mpError;
      logger.log('Michael Page importado:', mpResult);

      const totalImported = (haysResult?.inserted || 0) + (mpResult?.inserted || 0);
      setBenchmarkCount(totalImported);
      toast.success(`Dados importados com sucesso! ${totalImported} registros.`);
    } catch (error: any) {
      logger.error('Erro ao importar dados:', error);
      toast.error('Erro ao importar dados de salário');
    } finally {
      setImporting(false);
    }
  };

  const handleGerarEstudo = async () => {
    if (!cargo) {
      toast.error("Preencha o campo obrigatório: Cargo");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("gerar-estudo-mercado", {
        body: {
          cargo,
          sinonimos: sinonimos.length > 0 ? sinonimos : undefined,
          senioridade: senioridade || null,
          localidade: localidade || null,
          forceRefresh
        }
      });
      if (error) throw error;
      if (data?.erro) {
        toast.error(data.mensagem || "Erro ao gerar estudo");
        return;
      }
      setEstudo(data);
      toast.success("Estudo gerado com sucesso!");
    } catch (error: any) {
      logger.error("Erro ao gerar estudo:", error);
      toast.error(error.message || "Erro ao gerar estudo de mercado");
    } finally {
      setLoading(false);
    }
  };

  const handleExportarPDF = async () => {
    if (!estudo) return;
    try {
      await generateEstudoMercadoPdf(estudo);
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar PDF");
    }
  };

  const renderFaixaPorte = (faixa: FaixaPorPorte | null, label: string) => {
    if (!faixa) return null;
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">Mínimo</p>
            <p className="font-semibold">{faixa.min || '—'}</p>
          </div>
          <div className="bg-primary/10 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">Médio</p>
            <p className="font-bold text-primary">{faixa.media || '—'}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">Máximo</p>
            <p className="font-semibold">{faixa.max || '—'}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderSetorCard = (setor: ResultadoSetor) => {
    return (
      <div key={setor.setor} className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="font-medium">
            {setor.setor}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {setor.registros_base} registro{setor.registros_base !== 1 ? 's' : ''}
          </span>
        </div>
        
        {renderFaixaPorte(setor.por_porte.peq_med, "Pequena/Média Empresa")}
        {renderFaixaPorte(setor.por_porte.grande, "Grande Empresa")}
        
        {setor.trecho_consultado && (
          <Collapsible>
            <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
              <Info className="h-3 w-3" />
              Ver trecho consultado
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="bg-muted/50 rounded p-2 text-xs text-muted-foreground italic">
                "{setor.trecho_consultado}"
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    );
  };

  const renderResultadoFonte = (fonte: ResultadoFonte, nomeFonte: string, corBorda: string) => {
    return (
      <Card className={`border-l-4 ${corBorda}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{nomeFonte}</CardTitle>
            {fonte.encontrado ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                {fonte.setores?.length || 0} setor{(fonte.setores?.length || 0) !== 1 ? 'es' : ''}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                <XCircle className="h-3 w-3 mr-1" />
                Não encontrado
              </Badge>
            )}
          </div>
        </CardHeader>
        {fonte.encontrado && fonte.setores && fonte.setores.length > 0 && (
          <CardContent className="space-y-4">
            {fonte.setores.map((setor) => renderSetorCard(setor))}
            
            {fonte.observacao && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <Info className="h-4 w-4 inline mr-1" />
                  {fonte.observacao}
                </p>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8 max-w-5xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Estudo de Mercado Salarial</h1>
          <p className="text-muted-foreground">Compare salários com dados de Hays, Michael Page 2026, InfoJobs e Glassdoor (tempo real)</p>
        </div>

        {/* Aviso de dados não importados */}
        {!checkingData && benchmarkCount === 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Database className="h-6 w-6 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-900">Base de dados vazia</p>
                    <p className="text-sm text-amber-700">
                      É necessário importar os dados salariais antes de realizar consultas.
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleImportData} 
                  disabled={importing}
                  variant="outline"
                  className="border-amber-400 text-amber-900 hover:bg-amber-100"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Importar Dados
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info de dados importados */}
        {!checkingData && benchmarkCount !== null && benchmarkCount > 0 && (
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Database className="h-4 w-4" />
              <span>{benchmarkCount.toLocaleString()} registros de benchmark disponíveis</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleImportData}
              disabled={importing}
              className="text-xs"
            >
              {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              <span className="ml-1">Reimportar</span>
            </Button>
          </div>
        )}

        {/* Formulário Simplificado */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Informações da Consulta</CardTitle>
            <CardDescription>Preencha os dados para consultar as faixas salariais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cargo">
                  Cargo <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="cargo" 
                  placeholder="Ex: Analista de Customer Success" 
                  value={cargo} 
                  onChange={e => setCargo(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senioridade">Senioridade</Label>
                <Select value={senioridade} onValueChange={setSenioridade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="junior">Júnior</SelectItem>
                    <SelectItem value="pleno">Pleno</SelectItem>
                    <SelectItem value="senior">Sênior</SelectItem>
                    <SelectItem value="especialista">Especialista</SelectItem>
                    <SelectItem value="coordenador">Coordenador</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="diretor">Diretor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="localidade">Localidade</Label>
                <Input 
                  id="localidade" 
                  placeholder="Ex: São Paulo, Brasil" 
                  value={localidade} 
                  onChange={e => setLocalidade(e.target.value)} 
                />
              </div>
            </div>

            {/* Synonyms Section */}
            {cargo.trim() && (
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tags className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Termos alternativos para busca</Label>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {sinonimos.length} termo{sinonimos.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Estes termos serão usados para buscar em InfoJobs e Glassdoor, aumentando a chance de encontrar dados.
                </p>

                {/* Display synonyms as chips */}
                {sinonimos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {sinonimos.map((syn, idx) => (
                      <Badge 
                        key={idx} 
                        variant="outline" 
                        className="flex items-center gap-1 pr-1"
                      >
                        {syn}
                        <button
                          type="button"
                          onClick={() => handleRemoveSinonimo(idx)}
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Add new synonym */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar termo alternativo..."
                    value={novoSinonimo}
                    onChange={e => setNovoSinonimo(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSinonimo())}
                    className="flex-1 h-8 text-sm"
                  />
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline"
                    onClick={handleAddSinonimo}
                    disabled={!novoSinonimo.trim()}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="forceRefresh"
                  checked={forceRefresh}
                  onChange={(e) => setForceRefresh(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="forceRefresh" className="text-sm text-muted-foreground cursor-pointer">
                  Ignorar cache (forçar nova busca)
                </Label>
              </div>
              <Button onClick={handleGerarEstudo} disabled={loading} className="h-11 px-6">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Consultando...
                  </>
                ) : (
                  "Consultar Faixas Salariais"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        {estudo && (
          <div className="space-y-6">
            {/* Header do resultado */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">{estudo.consulta.cargo_pedido}</h2>
                <p className="text-muted-foreground">
                  {estudo.consulta.senioridade !== 'Não especificado' && `${estudo.consulta.senioridade} • `}
                  {estudo.consulta.localidade}
                </p>
              </div>
              <Button onClick={handleExportarPDF} variant="outline" className="gap-2">
                <FileDown className="h-4 w-4" />
                Exportar PDF
              </Button>
            </div>

            {/* Aviso sobre regime CLT */}
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Importante: Valores baseados em regime CLT</AlertTitle>
              <AlertDescription className="text-amber-700">
                Os dados salariais apresentados por todas as fontes consultadas (Hays, Michael Page, InfoJobs e Glassdoor) 
                são referentes ao regime de contratação CLT. Para estimativas de valores PJ, considere um acréscimo 
                de aproximadamente 30% a 45% sobre os valores apresentados.
              </AlertDescription>
            </Alert>

            {/* Comparativo lado a lado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderResultadoFonte(estudo.resultado.hays, "Hays 2026", "border-l-blue-500")}
              {renderResultadoFonte(estudo.resultado.michael_page, "Michael Page 2026", "border-l-purple-500")}
            </div>

            {/* InfoJobs Card */}
            {estudo.resultado.infojobs && (
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Globe className="h-5 w-5 text-green-600" />
                      InfoJobs Brasil
                    </CardTitle>
                    {estudo.resultado.infojobs.encontrado ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Dados em tempo real
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                        <XCircle className="h-3 w-3 mr-1" />
                        Não encontrado
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                {estudo.resultado.infojobs.encontrado && (
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Salário Médio */}
                      <div className="bg-green-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-green-700 font-medium">Salário Médio</p>
                        <p className="text-2xl font-bold text-green-800">
                          {estudo.resultado.infojobs.salario_medio || '—'}
                        </p>
                      </div>
                      
                      {/* Faixa Salarial */}
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <p className="text-sm text-muted-foreground font-medium">Faixa Salarial</p>
                        <p className="text-lg font-semibold">
                          {estudo.resultado.infojobs.faixa.min || '—'} - {estudo.resultado.infojobs.faixa.max || '—'}
                        </p>
                      </div>
                      
                      {/* Registros Base */}
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <p className="text-sm text-muted-foreground font-medium">Base de Dados</p>
                        <p className="text-lg font-semibold">
                          {estudo.resultado.infojobs.registros_base 
                            ? `${estudo.resultado.infojobs.registros_base.toLocaleString('pt-BR')} salários`
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        <Info className="h-3 w-3 inline mr-1" />
                        Dados baseados em salários reportados por profissionais brasileiros
                      </p>
                      {estudo.resultado.infojobs.url && (
                        <a 
                          href={estudo.resultado.infojobs.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                        >
                          Ver no InfoJobs
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Glassdoor Card */}
            {estudo.resultado.glassdoor && (
              <Card className="border-l-4 border-l-teal-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-teal-600" />
                      Glassdoor Brasil
                    </CardTitle>
                    {estudo.resultado.glassdoor.encontrado ? (
                      <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Dados em tempo real
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                        <XCircle className="h-3 w-3 mr-1" />
                        Não encontrado
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                {estudo.resultado.glassdoor.encontrado && (
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Salário Médio */}
                      <div className="bg-teal-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-teal-700 font-medium">Salário Médio</p>
                        <p className="text-2xl font-bold text-teal-800">
                          {estudo.resultado.glassdoor.salario_medio || '—'}
                        </p>
                      </div>
                      
                      {/* Faixa Salarial */}
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <p className="text-sm text-muted-foreground font-medium">Faixa Salarial</p>
                        <p className="text-lg font-semibold">
                          {estudo.resultado.glassdoor.faixa.min || '—'} - {estudo.resultado.glassdoor.faixa.max || '—'}
                        </p>
                      </div>
                      
                      {/* Registros Base */}
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <p className="text-sm text-muted-foreground font-medium">Base de Dados</p>
                        <p className="text-lg font-semibold">
                          {estudo.resultado.glassdoor.registros_base 
                            ? `${estudo.resultado.glassdoor.registros_base.toLocaleString('pt-BR')} salários`
                            : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Remuneração Variável (diferencial do Glassdoor) */}
                    {estudo.resultado.glassdoor.remuneracao_variavel && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-4 w-4 text-amber-600" />
                          <p className="text-sm font-medium text-amber-800">Remuneração Variável (Bônus)</p>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-xs text-amber-600">Mínimo</p>
                            <p className="font-semibold text-amber-800">
                              {estudo.resultado.glassdoor.remuneracao_variavel.min || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-amber-600">Média</p>
                            <p className="font-bold text-amber-900">
                              {estudo.resultado.glassdoor.remuneracao_variavel.media || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-amber-600">Máximo</p>
                            <p className="font-semibold text-amber-800">
                              {estudo.resultado.glassdoor.remuneracao_variavel.max || '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        <Info className="h-3 w-3 inline mr-1" />
                        {estudo.resultado.glassdoor.ultima_atualizacao 
                          ? `Atualizado em ${estudo.resultado.glassdoor.ultima_atualizacao}`
                          : 'Dados reportados por funcionários'}
                      </p>
                      {estudo.resultado.glassdoor.url && (
                        <a 
                          href={estudo.resultado.glassdoor.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
                        >
                          Ver no Glassdoor
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Insights Consultivos */}
            {estudo.consultoria && estudo.consultoria.length > 0 && (
              <Card className="border-l-4 border-l-amber-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    Insights Consultivos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {estudo.consultoria.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-medium">
                          {idx + 1}
                        </span>
                        <p className="text-muted-foreground">{insight}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Fontes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fontes Consultadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {estudo.resultado.hays.encontrado && (
                    <Badge variant="secondary">{estudo.resultado.hays.fonte}</Badge>
                  )}
                  {estudo.resultado.michael_page.encontrado && (
                    <Badge variant="secondary">{estudo.resultado.michael_page.fonte}</Badge>
                  )}
                  {estudo.resultado.infojobs?.encontrado && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      {estudo.resultado.infojobs.fonte}
                    </Badge>
                  )}
                  {estudo.resultado.glassdoor?.encontrado && (
                    <Badge variant="secondary" className="bg-teal-100 text-teal-700">
                      {estudo.resultado.glassdoor.fonte}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Todos os valores em R$/mês (regime CLT). Hays e Michael Page: guias salariais 2026. InfoJobs e Glassdoor: dados em tempo real. 
                  Para estimativas PJ, considere acréscimo de 30-45%.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
