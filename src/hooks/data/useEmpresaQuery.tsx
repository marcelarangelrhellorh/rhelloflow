import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CACHE_TIMES } from "@/lib/queryConfig";

// Query keys centralizados para empresas
export const empresaKeys = {
  all: ["empresas"] as const,
  detail: (id: string) => [...empresaKeys.all, "detail", id] as const,
  vagas: (id: string) => [...empresaKeys.detail(id), "vagas"] as const,
  contratacoes: (id: string) => [...empresaKeys.detail(id), "contratacoes"] as const,
  linkedUsers: (id: string) => [...empresaKeys.detail(id), "linkedUsers"] as const,
};

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string | null;
  setor: string | null;
  porte: string | null;
  status: string | null;
  telefone: string | null;
  email: string | null;
  site: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  contato_principal_nome: string | null;
  contato_principal_cargo: string | null;
  contato_principal_email: string | null;
  contato_principal_telefone: string | null;
  observacoes: string | null;
  created_at: string | null;
  updated_at: string | null;
  data_primeiro_contato: string | null;
  pipeline_stage: string | null;
  // Dados Receita Federal
  situacao_cadastral: string | null;
  data_situacao_cadastral: string | null;
  data_abertura: string | null;
  natureza_juridica: string | null;
  capital_social: number | null;
  atividade_principal: unknown;
  atividades_secundarias: unknown;
  quadro_societario: unknown;
  cnpj_consultado_em: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
}

async function fetchEmpresa(id: string): Promise<Empresa | null> {
  const { data, error } = await supabase
    .from("empresas")
    .select("*")
    .eq("id", id)
    .single();
  
  if (error) throw error;
  return data as Empresa;
}

async function fetchEmpresaVagas(empresaId: string) {
  const { data, error } = await supabase
    .from("vagas")
    .select("id, titulo, status, status_slug, criado_em, recrutador_id, cs_id")
    .eq("empresa_id", empresaId)
    .is("deleted_at", null)
    .order("criado_em", { ascending: false });
  
  if (error) throw error;
  return data;
}

async function fetchEmpresaContratacoes(empresaId: string) {
  // Primeiro buscar vagas da empresa
  const { data: vagasData } = await supabase
    .from("vagas")
    .select("id")
    .eq("empresa_id", empresaId)
    .is("deleted_at", null);
  
  if (!vagasData || vagasData.length === 0) return [];
  
  const vagaIds = vagasData.map(v => v.id);
  
  const { data, error } = await supabase
    .from("candidatos")
    .select("id, nome_completo, vaga_relacionada_id, criado_em, hired_at")
    .in("vaga_relacionada_id", vagaIds)
    .eq("status", "Contratado")
    .is("deleted_at", null)
    .order("hired_at", { ascending: false });
  
  if (error) throw error;
  return data;
}

async function fetchLinkedUsers(empresaId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, created_at, avatar_url")
    .eq("empresa_id", empresaId);
  
  if (error) throw error;
  return data;
}

export function useEmpresaQuery(id: string | undefined) {
  const queryClient = useQueryClient();

  // Query principal da empresa
  const {
    data: empresa,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: empresaKeys.detail(id || ""),
    queryFn: () => fetchEmpresa(id!),
    enabled: !!id,
    staleTime: CACHE_TIMES.DEFAULT.staleTime,
    gcTime: CACHE_TIMES.DEFAULT.gcTime,
  });

  // Query de vagas da empresa
  const { data: vagas, isLoading: vagasLoading } = useQuery({
    queryKey: empresaKeys.vagas(id || ""),
    queryFn: () => fetchEmpresaVagas(id!),
    enabled: !!id,
    staleTime: CACHE_TIMES.DEFAULT.staleTime,
  });

  // Query de contratações
  const { data: contratacoes, isLoading: contratacoesLoading } = useQuery({
    queryKey: empresaKeys.contratacoes(id || ""),
    queryFn: () => fetchEmpresaContratacoes(id!),
    enabled: !!id,
    staleTime: CACHE_TIMES.DEFAULT.staleTime,
  });

  // Query de usuários vinculados
  const { data: linkedUsers } = useQuery({
    queryKey: empresaKeys.linkedUsers(id || ""),
    queryFn: () => fetchLinkedUsers(id!),
    enabled: !!id,
    staleTime: CACHE_TIMES.DEFAULT.staleTime,
  });

  // Real-time subscription
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`empresa-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "empresas",
          filter: `id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: empresaKeys.detail(id) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  // Mutation para atualizar empresa
  const updateEmpresa = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from("empresas")
        .update(updates)
        .eq("id", id!)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: empresaKeys.detail(id!) });
      queryClient.invalidateQueries({ queryKey: empresaKeys.all });
    },
  });

  // Mutation para deletar empresa
  const deleteEmpresa = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("empresas")
        .delete()
        .eq("id", id!);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: empresaKeys.all });
    },
  });

  // Cálculo de KPIs
  const vagasAbertas = vagas?.filter(
    v => v.status_slug !== "concluida" && v.status_slug !== "cancelada"
  ).length || 0;
  
  const vagasConcluidas = vagas?.filter(
    v => v.status_slug === "concluida"
  ).length || 0;
  
  const totalContratacoes = contratacoes?.length || 0;

  return {
    empresa,
    vagas,
    contratacoes,
    linkedUsers,
    isLoading,
    vagasLoading,
    contratacoesLoading,
    error,
    refetch,
    updateEmpresa,
    deleteEmpresa,
    // KPIs
    vagasAbertas,
    vagasConcluidas,
    totalContratacoes,
  };
}

// Export helper para invalidar cache
export function useInvalidateEmpresa() {
  const queryClient = useQueryClient();
  
  return {
    invalidateEmpresa: (id: string) => {
      queryClient.invalidateQueries({ queryKey: empresaKeys.detail(id) });
    },
    invalidateAllEmpresas: () => {
      queryClient.invalidateQueries({ queryKey: empresaKeys.all });
    },
  };
}
