import { useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Task, TaskPriority, TaskStatus, useCreateTask, useUpdateTask } from "@/hooks/useTasks";
import { useTaskSync } from "@/hooks/useTaskSync";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "lucide-react";

const taskSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  status: z.enum(['to_do', 'in_progress', 'done']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  due_date: z.string().optional(),
  assignee_id: z.string().min(1, "Responsável é obrigatório"),
  vaga_id: z.string().optional(),
  // Sync fields
  sync_enabled: z.boolean().default(true),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  reminder_minutes: z.number().optional(),
  attendee_emails: z.string().optional(), // Comma-separated emails
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
  const { syncTask, isCalendarConnected } = useTaskSync();
  const { isConnected: calendarConnected } = useGoogleCalendar();

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
      start_time: "09:00",
      end_time: "10:00",
      reminder_minutes: 30,
      attendee_emails: "",
    },
  });

  // Load users for assignee select
  const { data: users } = useQuery({
    queryKey: ["users-for-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  // Load vagas for select
  const { data: vagas } = useQuery({
    queryKey: ["vagas-for-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vagas")
        .select("id, titulo")
        .is("deleted_at", null)
        .order("titulo");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (task && task.id) {
      // Editing existing task
      form.reset({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : "",
        assignee_id: task.assignee_id || "",
        vaga_id: task.vaga_id || "",
        sync_enabled: task.sync_enabled ?? true,
        start_time: task.start_time || "09:00",
        end_time: task.end_time || "10:00",
        reminder_minutes: task.reminder_minutes || 30,
        attendee_emails: task.attendee_emails?.join(", ") || "",
      });
    } else {
      // Creating new task
      form.reset({
        title: "",
        description: "",
        status: "to_do",
        priority: "medium",
        due_date: "",
        assignee_id: "",
        vaga_id: defaultVagaId || "",
        sync_enabled: true,
        start_time: "09:00",
        end_time: "10:00",
        reminder_minutes: 30,
        attendee_emails: "",
      });
    }
  }, [task, defaultVagaId, form]);

  const isEditing = task && task.id;
  const syncEnabled = form.watch("sync_enabled");

  const onSubmit = async (data: TaskFormData) => {
    // Parse attendee emails from comma-separated string
    const attendeeEmails = data.attendee_emails
      ? data.attendee_emails.split(',').map(e => e.trim()).filter(e => e.includes('@'))
      : [];

    const taskData = {
      ...data,
      due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
      assignee_id: data.assignee_id || null,
      vaga_id: data.vaga_id || null,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      reminder_minutes: data.reminder_minutes || 30,
      attendee_emails: attendeeEmails,
    };

    let savedTask: any;
    
    if (isEditing) {
      savedTask = await updateTask.mutateAsync({ id: task.id, ...taskData });
      
      // Auto-sync if connected and enabled
      if (calendarConnected && data.sync_enabled && data.due_date) {
        syncTask(task.id, 'update');
      }
    } else {
      savedTask = await createTask.mutateAsync(taskData);
      
      // Auto-sync new task if connected and enabled
      if (calendarConnected && data.sync_enabled && data.due_date && savedTask?.id) {
        syncTask(savedTask.id, 'create');
      }
    }

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
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

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
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

            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Vincular a (opcional)</h3>
              
              <FormField
                control={form.control}
                name="vaga_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vaga</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Nenhuma vaga" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vagas?.map((vaga) => (
                          <SelectItem key={vaga.id} value={vaga.id}>
                            {vaga.titulo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Google Calendar Sync Options */}
            {calendarConnected && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Google Calendar</h3>
                </div>
                
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
                        <FormLabel>Sincronizar com Google Calendar</FormLabel>
                        <FormDescription>
                          Esta tarefa será automaticamente adicionada ao seu calendário
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {syncEnabled && (
                  <div className="space-y-4 pl-6">
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="start_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Horário início</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="end_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Horário término</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="reminder_minutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lembrete</FormLabel>
                            <Select 
                              onValueChange={(val) => field.onChange(parseInt(val))} 
                              value={field.value?.toString() || "30"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Lembrete" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="5">5 minutos antes</SelectItem>
                                <SelectItem value="15">15 minutos antes</SelectItem>
                                <SelectItem value="30">30 minutos antes</SelectItem>
                                <SelectItem value="60">1 hora antes</SelectItem>
                                <SelectItem value="1440">1 dia antes</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="attendee_emails"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Participantes (e-mails)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="email1@exemplo.com, email2@exemplo.com" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Adicione e-mails separados por vírgula. Um link do Google Meet será gerado e os convites serão enviados automaticamente.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#ffcd00] hover:bg-[#ffcd00]/90 text-black font-semibold"
                disabled={createTask.isPending || updateTask.isPending}
              >
                {isEditing ? "Salvar Alterações" : "Criar Tarefa"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
