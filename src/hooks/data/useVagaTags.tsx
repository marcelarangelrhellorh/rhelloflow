import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type VagaTag = {
  id: string;
  label: string;
  category: string;
};

export function useVagaTags(vagaId: string | undefined) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [vagaTags, setVagaTags] = useState<VagaTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!vagaId) {
      setLoading(false);
      return;
    }

    loadTags();
  }, [vagaId]);

  const loadTags = async () => {
    if (!vagaId) return;

    try {
      setLoading(true);
      
      // Buscar IDs das tags da vaga
      const { data: vacancyTagsData, error: vacancyTagsError } = await (supabase as any)
        .from("vacancy_tags")
        .select("tag_id")
        .eq("vacancy_id", vagaId);

      if (vacancyTagsError) throw vacancyTagsError;

      if (vacancyTagsData && vacancyTagsData.length > 0) {
        const tagIds = vacancyTagsData.map((vt: any) => vt.tag_id);
        setSelectedTags(tagIds);

        // Carregar dados completos das tags
        const { data: tagsData, error: tagsError } = await (supabase as any)
          .from("tags")
          .select("id, label, category")
          .in("id", tagIds);

        if (tagsError) throw tagsError;

        if (tagsData) {
          setVagaTags(tagsData);
        }
      }
    } catch (err) {
      const error = err as Error;
      console.error("Erro ao carregar tags:", error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  const saveTags = async () => {
    if (!vagaId) return;

    setSaving(true);
    try {
      // Remover todas as tags existentes
      await (supabase as any)
        .from("vacancy_tags")
        .delete()
        .eq("vacancy_id", vagaId);

      // Inserir novas tags
      if (selectedTags.length > 0) {
        const tagsToInsert = selectedTags.map((tagId) => ({
          vacancy_id: vagaId,
          tag_id: tagId,
        }));

        const { error: insertError } = await (supabase as any)
          .from("vacancy_tags")
          .insert(tagsToInsert);

        if (insertError) throw insertError;
      }

      // Recarregar tags após salvar
      await loadTags();

      toast({
        title: "Tags atualizadas",
        description: "As tags da vaga foram atualizadas com sucesso.",
      });
    } catch (err) {
      const error = err as Error;
      console.error("Erro ao salvar tags:", error);
      toast({
        title: "Erro ao salvar tags",
        description: "Não foi possível atualizar as tags da vaga.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return {
    selectedTags,
    setSelectedTags,
    vagaTags,
    loading,
    saving,
    error,
    saveTags,
    reload: loadTags,
  };
}
