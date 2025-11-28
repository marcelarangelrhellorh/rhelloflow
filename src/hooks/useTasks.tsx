import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TaskStatus = 'to_do' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_by: string | null;
  assignee_id: string | null;
  vaga_id: string | null;
  empresa_id: string | null;
  candidato_id: string | null;
  created_at: string;
  updated_at: string;
  // Google Calendar sync fields
  google_calendar_event_id: string | null;
  google_calendar_synced: boolean;
  google_calendar_last_sync: string | null;
  sync_enabled: boolean;
  calendar_id: string | null;
  start_time: string | null;
  end_time: string | null;
  reminder_minutes: number | null;
  attendee_emails: string[] | null;
  google_meet_link: string | null;
  // Relations
  assignee?: {
    id: string;
    full_name: string;
  };
  vaga?: {
    id: string;
    titulo: string;
  };
  empresa?: {
    id: string;
    nome: string;
  };
  candidato?: {
    id: string;
    nome_completo: string;
  };
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string;
  search?: string;
}

export function useTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey(id, full_name),
          vaga:vagas(id, titulo),
          empresa:empresas(id, nome),
          candidato:candidatos(id, nome_completo)
        `)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.priority) {
        query = query.eq("priority", filters.priority);
      }
      if (filters?.assignee_id) {
        query = query.eq("assignee_id", filters.assignee_id);
      }
      if (filters?.search) {
        query = query.ilike("title", `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Task[];
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: Partial<Task>) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const { assignee, vaga, empresa, candidato, ...taskData } = task as any;

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          ...taskData,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["vaga-tasks"] });
      toast.success("Tarefa criada com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao criar tarefa: " + error.message);
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...task }: Partial<Task> & { id: string }) => {
      const { assignee, vaga, empresa, candidato, ...taskData } = task as any;

      const { data, error } = await supabase
        .from("tasks")
        .update(taskData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["vaga-tasks"] });
      toast.success("Tarefa atualizada com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar tarefa: " + error.message);
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["vaga-tasks"] });
      toast.success("Tarefa excluída com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao excluir tarefa: " + error.message);
    },
  });
}

export function useOverdueTasks(isAdmin: boolean = false) {
  return useQuery({
    queryKey: ["tasks-overdue", isAdmin],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const now = new Date().toISOString();

      let query = supabase
        .from("tasks")
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey(id, full_name),
          vaga:vagas(id, titulo),
          empresa:empresas(id, nome),
          candidato:candidatos(id, nome_completo)
        `)
        .neq("status", "done")
        .lt("due_date", now)
        .not("due_date", "is", null);

      // Se não for admin, filtrar apenas tarefas do usuário
      if (!isAdmin) {
        query = query.eq("assignee_id", userData.user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Task[];
    },
  });
}

export function usePriorityTasks(priority: TaskPriority, isAdmin: boolean = false) {
  return useQuery({
    queryKey: ["tasks-priority", priority, isAdmin],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      let query = supabase
        .from("tasks")
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey(id, full_name),
          vaga:vagas(id, titulo),
          empresa:empresas(id, nome),
          candidato:candidatos(id, nome_completo)
        `)
        .eq("priority", priority)
        .neq("status", "done");

      // Se não for admin, filtrar apenas tarefas do usuário
      if (!isAdmin) {
        query = query.eq("assignee_id", userData.user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Task[];
    },
  });
}
