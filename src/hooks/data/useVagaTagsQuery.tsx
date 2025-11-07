import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { VagaTag } from "./useVagaTags";

export const vagaTagsKeys = {
  all: ["vaga-tags"] as const,
  byVaga: (vagaId: string) => [...vagaTagsKeys.all, vagaId] as const,
};

async function fetchVagaTags(vagaId: string): Promise<{
  selectedTags: string[];
  vagaTags: VagaTag[];
}> {
  // Fetch tag associations
  const { data: tagIds, error: tagsError } = await supabase
    .from("vacancy_tags")
    .select("tag_id")
    .eq("vacancy_id", vagaId);

  if (tagsError) throw tagsError;

  const selectedTagIds = (tagIds || []).map((t) => t.tag_id);

  if (selectedTagIds.length === 0) {
    return { selectedTags: [], vagaTags: [] };
  }

  // Fetch full tag data
  const { data: tagsData, error: tagsDataError } = await supabase
    .from("tags")
    .select("id, label, category")
    .in("id", selectedTagIds);

  if (tagsDataError) throw tagsDataError;

  return {
    selectedTags: selectedTagIds,
    vagaTags: (tagsData || []) as VagaTag[],
  };
}

async function saveVagaTags(vagaId: string, tagIds: string[]) {
  // Delete existing associations
  const { error: deleteError } = await supabase
    .from("vacancy_tags")
    .delete()
    .eq("vacancy_id", vagaId);

  if (deleteError) throw deleteError;

  // Insert new associations
  if (tagIds.length > 0) {
    const { error: insertError } = await supabase
      .from("vacancy_tags")
      .insert(tagIds.map((tagId) => ({ vacancy_id: vagaId, tag_id: tagId })));

    if (insertError) throw insertError;
  }
}

export function useVagaTagsQuery(vagaId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: vagaTagsKeys.byVaga(vagaId!),
    queryFn: () => fetchVagaTags(vagaId!),
    enabled: !!vagaId,
  });

  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);

  // Sync local state with query data
  React.useEffect(() => {
    if (query.data?.selectedTags) {
      setSelectedTags(query.data.selectedTags);
    }
  }, [query.data?.selectedTags]);

  const saveMutation = useMutation({
    mutationFn: () => saveVagaTags(vagaId!, selectedTags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vagaTagsKeys.byVaga(vagaId!) });
    },
  });

  return {
    selectedTags,
    setSelectedTags,
    vagaTags: query.data?.vagaTags || [],
    loading: query.isLoading,
    saving: saveMutation.isPending,
    error: query.error as Error | null,
    saveTags: () => saveMutation.mutate(),
    reload: query.refetch,
  };
}

// Re-export for easier migration
export { useVagaTagsQuery as useVagaTags };
