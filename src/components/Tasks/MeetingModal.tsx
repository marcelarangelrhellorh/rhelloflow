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
import { Button } from "@/components/ui/button";
import { Task, useCreateTask, useUpdateTask } from "@/hooks/useTasks";
import { useTaskSync } from "@/hooks/useTaskSync";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfilesByRole } from "@/hooks/data/useProfilesByRole";
import { Video } from "lucide-react";

const meetingSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  due_date: z.string().min(1, "Data é obrigatória"),
  start_time: z.string().min(1, "Horário de início é obrigatório"),
  end_time: z.string().min(1, "Horário de término é obrigatório"),
  assignee_id: z.string().min(1, "Responsável é obrigatório"),
  vaga_id: z.string().optional(),
  candidato_id: z.string().optional(),
  attendee_emails: z.string().optional(),
  reminder_minutes: z.number().default(30),
}).refine((data) => data.vaga_id || data.candidato_id, {
  message: "É necessário vincular a reunião a uma vaga ou candidato",
  path: ["vaga_id"],
});

type MeetingFormData = z.infer<typeof meetingSchema>;

interface MeetingModalProps {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  defaultVagaId?: string | null;
  defaultCandidateId?: string | null;
  candidateName?: string;
}

export default function MeetingModal({ open, onClose, task, defaultVagaId, defaultCandidateId, candidateName }: MeetingModalProps) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { syncTask } = useTaskSync();
  const { isConnected: calendarConnected } = useGoogleCalendar();

  const form = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      title: "",
      description: "",
      due_date: "",
      start_time: "09:00",
      end_time: "10:00",
      assignee_id: "",
      vaga_id: "",
      candidato_id: "",
      attendee_emails: "",
      reminder_minutes: 30,
    },
  });

  // Get current user email
  const { data: currentUser } = useQuery({
    queryKey: ["current-user-email"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Load recrutadores, CS and admins for assignee select
  const { data: users } = useProfilesByRole(['recrutador', 'cs', 'admin']);

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
    if (task && task.id && task.task_type === 'meeting') {
      // Robust date extraction with validation
      let dueDateStr = "";
      if (task.due_date) {
        try {
          const dueDate = new Date(task.due_date);
          if (!isNaN(dueDate.getTime())) {
            dueDateStr = dueDate.toISOString().slice(0, 10);
          }
        } catch (e) {
          console.error('Error parsing due_date:', task.due_date);
        }
      }
      
      form.reset({
        title: task.title,
        description: task.description || "",
        due_date: dueDateStr,
        start_time: task.start_time || "09:00",
        end_time: task.end_time || "10:00",
        assignee_id: task.assignee_id || "",
        vaga_id: task.vaga_id || "",
        candidato_id: task.candidato_id || "",
        attendee_emails: task.attendee_emails?.join(", ") || "",
        reminder_minutes: task.reminder_minutes || 30,
      });
    } else {
      // Pre-fill with creator's email for new meetings
      form.reset({
        title: "",
        description: "",
        due_date: "",
        start_time: "09:00",
        end_time: "10:00",
        assignee_id: "",
        vaga_id: defaultVagaId || "",
        candidato_id: defaultCandidateId || "",
        attendee_emails: currentUser?.email || "",
        reminder_minutes: 30,
      });
    }
  }, [task, defaultVagaId, defaultCandidateId, form, currentUser?.email]);

  const isEditing = task && task.id && task.task_type === 'meeting';

  const onSubmit = async (data: MeetingFormData) => {
    // Parse attendee emails from comma-separated string
    const attendeeEmails = data.attendee_emails
      ? data.attendee_emails.split(',').map(e => e.trim()).filter(e => e.includes('@'))
      : [];

    // Ensure creator's email is always included
    if (currentUser?.email && !attendeeEmails.includes(currentUser.email)) {
      attendeeEmails.unshift(currentUser.email);
    }

    // Combine date and time for due_date
    // Ensure start_time is only HH:MM (may come with seconds from DB)
    const timeOnly = data.start_time.slice(0, 5);
    const dueDateTime = new Date(`${data.due_date}T${timeOnly}:00`);

    // Validate that the date is valid before proceeding
    if (isNaN(dueDateTime.getTime())) {
      console.error('Invalid date:', data.due_date, data.start_time);
      form.setError('due_date', { 
        type: 'manual', 
        message: 'Data inválida. Por favor, selecione uma data válida.' 
      });
      return;
    }

    const taskData = {
      title: data.title,
      description: data.description || null,
      status: 'to_do' as const,
      priority: 'medium' as const,
      due_date: dueDateTime.toISOString(),
      assignee_id: data.assignee_id || null,
      vaga_id: data.vaga_id || null,
      candidato_id: data.candidato_id || null,
      start_time: data.start_time,
      end_time: data.end_time,
      reminder_minutes: data.reminder_minutes,
      attendee_emails: attendeeEmails,
      task_type: 'meeting' as const,
      sync_enabled: true, // Meetings always sync to Calendar
    };

    let savedTask: any;
    
    if (isEditing && task) {
      savedTask = await updateTask.mutateAsync({ id: task.id, ...taskData });
      
      // Auto-sync to Google Calendar
      if (calendarConnected) {
        syncTask(task.id, 'update');
      }
    } else {
      savedTask = await createTask.mutateAsync(taskData);
      
      // Auto-sync new meeting to Google Calendar
      if (calendarConnected && savedTask?.id) {
        syncTask(savedTask.id, 'create');
      }
    }

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            {isEditing ? "Editar Reunião" : "Nova Reunião"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da Reunião *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Entrevista com candidato" {...field} />
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
                  <FormLabel>Descrição / Pauta</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva a pauta da reunião"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início *</FormLabel>
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
                    <FormLabel>Término *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            <FormField
              control={form.control}
              name="vaga_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vincular a Vaga {!defaultCandidateId && "*"}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhuma vaga" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vagas?.map((vaga) => (
                        <SelectItem key={vaga.id} value={vaga.id}>
                          {vaga.titulo} - {vaga.empresa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {defaultCandidateId && candidateName && (
                    <FormDescription>
                      Reunião com {candidateName}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {!calendarConnected && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <strong>Atenção:</strong> Conecte ao Google Calendar para sincronizar reuniões automaticamente e gerar links do Google Meet.
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
                {isEditing ? "Salvar Alterações" : "Criar Reunião"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
