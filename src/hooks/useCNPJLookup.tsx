import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cleanCNPJ, validateCNPJ } from '@/lib/cnpjUtils';
import { toast } from 'sonner';

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
