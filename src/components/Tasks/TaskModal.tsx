import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Task, useCreateTask, useUpdateTask } from "@/hooks/useTasks";
import { useTaskSync } from "@/hooks/useTaskSync";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfilesByRole } from "@/hooks/data/useProfilesByRole";
import { ListTodo } from "lucide-react";

const taskSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  status: z.enum(['to_do', 'in_progress', 'done']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  due_date: z.string().optional(),
  assignee_id: z.string().min(1, "Responsável é obrigatório"),
  vaga_id: z.string().optional(),
  sync_enabled: z.boolean().default(true),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  defaultVagaId?: string | null;
}

export default function TaskModal({ open, onClose, task, defaultVagaId }: TaskModalProps) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { syncTaskToGoogleTasks, isCalendarConnected } = useTaskSync();
  const { isConnected: googleConnected } = useGoogleCalendar();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "to_do",
      priority: "medium",
      due_date: "",
      assignee_id: "",
      vaga_id: "",
      sync_enabled: true,
    },
  });

  // Load only recrutadores and CS for assignee select
  const { data: users } = useProfilesByRole(['recrutador', 'cs']);

  // Load vagas for select
  const { data: vagas } = useQuery({
    queryKey: ["vagas-for-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vagas")
        .select("id, titulo, empresa")
        .is("deleted_at", null)
        .order("titulo");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (task && task.id && task.task_type !== 'meeting') {
      form.reset({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 10) : "",
        assignee_id: task.assignee_id || "",
        vaga_id: task.vaga_id || "",
        sync_enabled: task.sync_enabled ?? true,
      });
    } else {
      form.reset({
        title: "",
        description: "",
        status: "to_do",
        priority: "medium",
        due_date: "",
        assignee_id: "",
        vaga_id: defaultVagaId || "",
        sync_enabled: true,
      });
    }
  }, [task, defaultVagaId, form]);

  const isEditing = task && task.id && task.task_type !== 'meeting';

  const onSubmit = async (data: TaskFormData) => {
    const taskData = {
      title: data.title,
      description: data.description || null,
      status: data.status,
      priority: data.priority,
      due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
      assignee_id: data.assignee_id || null,
      vaga_id: data.vaga_id || null,
      sync_enabled: data.sync_enabled,
      task_type: 'task' as const, // Tasks go to Google Tasks API
    };

    let savedTask: any;
    
    if (isEditing && task) {
      savedTask = await updateTask.mutateAsync({ id: task.id, ...taskData });
      
      // Auto-sync to Google Tasks if connected and enabled
      if (googleConnected && data.sync_enabled) {
        syncTaskToGoogleTasks(task.id, 'update');
      }
    } else {
      savedTask = await createTask.mutateAsync(taskData);
      
      // Auto-sync new task to Google Tasks if connected and enabled
      if (googleConnected && data.sync_enabled && savedTask?.id) {
        syncTaskToGoogleTasks(savedTask.id, 'create');
      }
    }

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <ListTodo className="h-6 w-6 text-primary" />
            {isEditing ? "Editar Tarefa" : "Nova Tarefa"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o título da tarefa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva os detalhes da tarefa"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="to_do">A Fazer</SelectItem>
                        <SelectItem value="in_progress">Em Andamento</SelectItem>
                        <SelectItem value="done">Concluída</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a prioridade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignee_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o responsável" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="vaga_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vincular a Vaga</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhuma vaga" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Nenhuma vaga</SelectItem>
                      {vagas?.map((vaga) => (
                        <SelectItem key={vaga.id} value={vaga.id}>
                          {vaga.titulo} - {vaga.empresa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Google Tasks Sync */}
            {googleConnected && (
              <div className="space-y-4 border-t pt-4">
                <FormField
                  control={form.control}
                  name="sync_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Sincronizar com Google Tasks</FormLabel>
                        <FormDescription>
                          Esta tarefa será adicionada ao Google Tasks automaticamente
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <LoadingButton
                type="submit"
                className="bg-[#ffcd00] hover:bg-[#ffcd00]/90 text-black font-semibold w-full sm:w-auto"
                loading={createTask.isPending || updateTask.isPending}
                loadingText={isEditing ? "Salvando..." : "Criando..."}
              >
                {isEditing ? "Salvar Alterações" : "Criar Tarefa"}
              </LoadingButton>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
