import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cleanCNPJ, validateCNPJ } from '@/lib/cnpjUtils';
import { toast } from 'sonner';

export interface AtividadeEconomica {
  code: string;
  text: string;
}

// Mapeamento do porte da Receita Federal para o formato do sistema
function mapPorteReceita(porteReceita: string): string {
  const porte = porteReceita?.toUpperCase() || '';
  
  if (porte.includes('MICRO')) return 'Micro';
  if (porte.includes('PEQUENO') || porte.includes('PEQUENA')) return 'Pequena';
  if (porte.includes('MÉDIO') || porte.includes('MEDIO')) return 'Média';
  if (porte.includes('GRANDE')) return 'Grande';
  if (porte === 'DEMAIS') return 'Média';
  
  return '';
}

// Mapeamento da atividade principal (CNAE) para setor
function mapCNAEToSetor(atividadePrincipal: AtividadeEconomica[]): string {
  if (!atividadePrincipal?.length) return '';
  
  const descricao = atividadePrincipal[0].text?.toLowerCase() || '';
  
  if (descricao.includes('software') || descricao.includes('computador') || 
      descricao.includes('tecnologia') || descricao.includes('informática') ||
      descricao.includes('sistemas') || descricao.includes('dados')) {
    return 'Tecnologia';
  }
  if (descricao.includes('consultoria')) return 'Consultoria';
  if (descricao.includes('advocacia') || descricao.includes('jurídic')) return 'Jurídico';
  if (descricao.includes('contábil') || descricao.includes('contabilidade')) return 'Contabilidade';
  if (descricao.includes('saúde') || descricao.includes('médic') || descricao.includes('hospital')) return 'Saúde';
  if (descricao.includes('comércio') || descricao.includes('varejo') || descricao.includes('atacado')) return 'Comércio';
  if (descricao.includes('fabricação') || descricao.includes('indústria')) return 'Indústria';
  if (descricao.includes('construção') || descricao.includes('engenharia')) return 'Construção Civil';
  if (descricao.includes('financeira') || descricao.includes('banco') || descricao.includes('crédito')) return 'Financeiro';
  if (descricao.includes('educação') || descricao.includes('ensino') || descricao.includes('escola')) return 'Educação';
  if (descricao.includes('aliment') || descricao.includes('restaurante') || descricao.includes('bebida')) return 'Alimentação';
  if (descricao.includes('transporte') || descricao.includes('logística')) return 'Logística';
  if (descricao.includes('marketing') || descricao.includes('publicidade') || descricao.includes('propaganda')) return 'Marketing';
  if (descricao.includes('telecom') || descricao.includes('comunicação')) return 'Telecomunicações';
  if (descricao.includes('agropec') || descricao.includes('agrícola') || descricao.includes('pecuária')) return 'Agronegócio';
  if (descricao.includes('recrutamento') || descricao.includes('recursos humanos') || descricao.includes('seleção')) return 'Recursos Humanos';
  
  return '';
}

export interface CNPJData {
  razao_social: string;
  nome_fantasia: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  email: string;
  // Campos da Receita Federal
  situacao_cadastral: string;
  data_situacao_cadastral: string;
  data_abertura: string;
  natureza_juridica: string;
  capital_social: number;
  atividade_principal: AtividadeEconomica[];
  atividades_secundarias: AtividadeEconomica[];
  porte: string;
  setor: string;
}

export interface Socio {
  nome: string;
  qual: string;
}

interface UseCNPJLookupReturn {
  loading: boolean;
  error: string | null;
  dadosEmpresa: CNPJData | null;
  quadroSocietario: Socio[];
  consultarCNPJ: (cnpj: string) => Promise<CNPJData | null>;
  limparDados: () => void;
}

export function useCNPJLookup(): UseCNPJLookupReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dadosEmpresa, setDadosEmpresa] = useState<CNPJData | null>(null);
  const [quadroSocietario, setQuadroSocietario] = useState<Socio[]>([]);

  const limparDados = () => {
    setDadosEmpresa(null);
    setQuadroSocietario([]);
    setError(null);
  };

  const consultarCNPJ = async (cnpj: string): Promise<CNPJData | null> => {
    const cnpjLimpo = cleanCNPJ(cnpj);
    
    // Validar CNPJ antes de consultar
    if (!validateCNPJ(cnpjLimpo)) {
      const errorMsg = 'CNPJ inválido. Verifique os dígitos e tente novamente.';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('consultar-cnpj', {
        body: { cnpj: cnpjLimpo }
      });

      if (fnError) {
        throw new Error(fnError.message || 'Erro ao consultar CNPJ');
      }

      if (data.status === 'ERROR') {
        const errorMsg = data.message || 'CNPJ não encontrado na base da Receita Federal';
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
      }

      // Mapear dados da API para o formato do formulário
      const empresaData: CNPJData = {
        razao_social: data.nome || '',
        nome_fantasia: data.fantasia || data.nome || '',
        endereco: data.logradouro || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        cidade: data.municipio || '',
        estado: data.uf || '',
        cep: data.cep?.replace(/\D/g, '') || '',
        telefone: data.telefone || '',
        email: data.email || '',
        // Campos da Receita Federal
        situacao_cadastral: data.situacao || '',
        data_situacao_cadastral: data.data_situacao || '',
        data_abertura: data.abertura || '',
        natureza_juridica: data.natureza_juridica || '',
        capital_social: parseFloat(data.capital_social) || 0,
        atividade_principal: (data.atividade_principal || []).map((a: { code?: string; text?: string }) => ({
          code: a.code || '',
          text: a.text || ''
        })),
        atividades_secundarias: (data.atividades_secundarias || []).map((a: { code?: string; text?: string }) => ({
          code: a.code || '',
          text: a.text || ''
        })),
        porte: mapPorteReceita(data.porte),
        setor: mapCNAEToSetor(data.atividade_principal || []),
      };

      // Extrair quadro societário
      const socios: Socio[] = (data.qsa || []).map((s: { nome: string; qual: string }) => ({
        nome: s.nome || '',
        qual: s.qual || 'Sócio'
      }));

      setDadosEmpresa(empresaData);
      setQuadroSocietario(socios);
      toast.success('Dados do CNPJ carregados com sucesso!');
      
      return empresaData;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro de conexão. Tente novamente.';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    dadosEmpresa,
    quadroSocietario,
    consultarCNPJ,
    limparDados
  };
}
