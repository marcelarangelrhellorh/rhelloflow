import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Clock, Circle, AlertTriangle, Calendar, User, Briefcase, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { Task, TaskStatus, TaskPriority, useUpdateTask } from "@/hooks/useTasks";
import { isPast, isToday } from "date-fns";
import SyncTaskToCalendar from "@/components/Tasks/SyncTaskToCalendar";
interface TaskDetailDrawerProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (task: Task) => void;
}
const priorityConfig: Record<TaskPriority, {
  label: string;
  class: string;
}> = {
  low: {
    label: "Baixa",
    class: "bg-gray-100 text-gray-700"
  },
  medium: {
    label: "Média",
    class: "bg-blue-100 text-blue-700"
  },
  high: {
    label: "Alta",
    class: "bg-orange-100 text-orange-700"
  },
  urgent: {
    label: "Urgente",
    class: "bg-red-100 text-red-700"
  }
};
const statusConfig: Record<TaskStatus, {
  label: string;
  icon: typeof Circle;
  class: string;
}> = {
  to_do: {
    label: "A Fazer",
    icon: Circle,
    class: "text-muted-foreground"
  },
  in_progress: {
    label: "Em Andamento",
    icon: Clock,
    class: "text-blue-500"
  },
  done: {
    label: "Concluída",
    icon: CheckCircle2,
    class: "text-green-500"
  }
};
export function TaskDetailDrawer({
  task,
  open,
  onOpenChange,
  onEdit
}: TaskDetailDrawerProps) {
  const updateTask = useUpdateTask();
  if (!task) return null;
  const StatusIcon = statusConfig[task.status].icon;
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== "done";
  const handleComplete = async () => {
    await updateTask.mutateAsync({
      id: task.id,
      status: task.status === "done" ? "to_do" : "done"
    });
  };
  const handleEditClick = () => {
    onOpenChange(false);
    onEdit(task);
  };
  return <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <StatusIcon className={cn("h-5 w-5", statusConfig[task.status].class)} />
              <Badge className={cn("text-xs", priorityConfig[task.priority].class)}>
                {priorityConfig[task.priority].label}
              </Badge>
            </div>
          </div>
          <SheetTitle className="text-left text-xl font-bold mt-2">
            {task.title}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Status */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <StatusIcon className={cn("h-5 w-5", statusConfig[task.status].class)} />
            <div>
              <p className="text-muted-foreground text-base font-semibold">Status</p>
              <p className="font-medium">{statusConfig[task.status].label}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="font-semibold text-muted-foreground mb-2 text-base">Descrição</p>
            {task.description ? <p className="text-base leading-relaxed whitespace-pre-wrap">{task.description}</p> : <p className="text-base text-muted-foreground italic">Nenhuma descrição informada</p>}
          </div>

          <Separator />

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Due Date */}
            <div className="flex items-start gap-3">
              <Calendar className={cn("h-5 w-5 mt-0.5", isOverdue ? "text-red-500" : "text-muted-foreground")} />
              <div>
                <p className="text-muted-foreground text-base font-semibold">Prazo</p>
                {task.due_date ? <p className={cn("font-medium text-base", isOverdue && "text-red-600")}>
                    {isOverdue && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                    {format(new Date(task.due_date), "dd/MM/yyyy", {
                  locale: ptBR
                })}
                  </p> : <p className="text-base text-muted-foreground">Não definido</p>}
              </div>
            </div>

            {/* Assignee */}
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-base font-semibold">Responsável</p>
                <p className="font-medium text-base">
                  {task.assignee?.full_name || "Não atribuído"}
                </p>
              </div>
            </div>

            {/* Job Link */}
            {task.vaga && <div className="flex items-start gap-3 col-span-2">
                <Briefcase className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-base font-semibold">Vaga Vinculada</p>
                  <p className="font-medium text-base">{task.vaga.titulo}</p>
                </div>
              </div>}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button onClick={handleComplete} disabled={updateTask.isPending} className={cn("w-full gap-2 text-base font-semibold", task.status === "done" ? "bg-muted hover:bg-muted/80 text-foreground" : "bg-green-600 hover:bg-green-700 text-white")}>
              <CheckCircle2 className="h-4 w-4" />
              {task.status === "done" ? "Reabrir Tarefa" : "Marcar como Concluída"}
            </Button>

            <SyncTaskToCalendar task={task} variant="button" />

            <Button variant="outline" onClick={handleEditClick} className="w-full gap-2 text-base font-medium">
              <Edit className="h-4 w-4" />
              Editar Tarefa
            </Button>
          </div>

          {/* Metadata */}
          <div className="text-xs text-muted-foreground pt-4 border-t">
            <p className="text-base">Criada em {format(new Date(task.created_at), "dd/MM/yyyy 'às' HH:mm", {
              locale: ptBR
            })}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>;
}