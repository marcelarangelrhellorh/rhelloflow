import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Task } from "@/hooks/useTasks";

export function useVagaTasks(vagaId: string | undefined) {
  return useQuery({
    queryKey: ["vaga-tasks", vagaId],
    queryFn: async () => {
      if (!vagaId) return [];

      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey(id, full_name)
        `)
        .eq("vaga_id", vagaId)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Task[];
    },
    enabled: !!vagaId,
  });
}
