import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CACHE_TIMES, queryKeys } from "@/lib/queryConfig";
import { toast } from "sonner";

export interface Tag {
  id: string;
  label: string;
  category: string;
  slug: string;
}

interface CreateTagInput {
  label: string;
  category: string;
}

async function fetchTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("tags")
    .select("id, label, category, slug")
    .eq("active", true)
    .order("category")
    .order("label");

  if (error) throw error;
  return data || [];
}

async function createTag(input: CreateTagInput): Promise<Tag> {
  const { data, error } = await supabase
    .from("tags")
    .insert({
      label: input.label.trim(),
      category: input.category,
    })
    .select()
    .single();

  if (error) {
    if (error.message.includes("duplicate")) {
      throw new Error("Já existe uma tag com este nome nesta categoria");
    }
    throw error;
  }

  return data;
}

/**
 * Hook para gerenciar tags com cache longo (1 hora)
 * Tags são dados estáticos que raramente mudam
 */
export function useTags() {
  const queryClient = useQueryClient();

  const { data: tags, isLoading, error } = useQuery({
    queryKey: queryKeys.tags,
    queryFn: fetchTags,
    // Cache longo - tags raramente mudam
    staleTime: CACHE_TIMES.STATIC_DATA.staleTime,  // 1 hora
    gcTime: CACHE_TIMES.STATIC_DATA.gcTime,        // 24 horas
  });

  const createMutation = useMutation({
    mutationFn: createTag,
    onSuccess: (newTag) => {
      // Atualiza cache adicionando nova tag
      queryClient.setQueryData<Tag[]>(queryKeys.tags, (old) => {
        if (!old) return [newTag];
        return [...old, newTag].sort((a, b) => {
          // Ordena por categoria e depois por label
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
          }
          return a.label.localeCompare(b.label);
        });
      });
      toast.success("Tag criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao criar tag");
    },
  });

  return {
    tags: tags ?? [],
    loading: isLoading,
    error,
    createTag: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    invalidateTags: () => queryClient.invalidateQueries({ queryKey: queryKeys.tags }),
  };
}
