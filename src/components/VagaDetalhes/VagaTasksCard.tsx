import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckSquare, Plus, Circle, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useVagaTasks } from "@/hooks/data/useVagaTasks";
import { Task, TaskStatus, TaskPriority } from "@/hooks/useTasks";
import TaskModal from "@/components/Tasks/TaskModal";
import { TaskDetailDrawer } from "./TaskDetailDrawer";
interface VagaTasksCardProps {
  vagaId: string;
  vagaTitulo: string;
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
  icon: typeof Circle;
}> = {
  to_do: {
    icon: Circle
  },
  in_progress: {
    icon: Clock
  },
  done: {
    icon: CheckCircle2
  }
};
export function VagaTasksCard({
  vagaId,
  vagaTitulo
}: VagaTasksCardProps) {
  const {
    data: tasks = [],
    isLoading
  } = useVagaTasks(vagaId);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultVagaId, setDefaultVagaId] = useState<string | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const pendingTasks = tasks.filter(t => t.status !== "done");
  const overdueTasks = pendingTasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailDrawerOpen(true);
  };
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setDefaultVagaId(null);
    setModalOpen(true);
  };
  const handleNewTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTask(null);
    setDefaultVagaId(vagaId);
    setModalOpen(true);
  };
  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingTask(null);
    setDefaultVagaId(null);
  };
  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return isPast(new Date(dueDate)) && !isToday(new Date(dueDate));
  };
  if (isLoading) {
    return <div className="flex flex-col gap-2 rounded-lg p-6 bg-white dark:bg-background-dark border border-gray-200 dark:border-secondary-text-light/20 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          <div className="h-6 w-16 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
      </div>;
  }
  return <>
      <div className="flex flex-col gap-3 rounded-lg p-6 bg-white dark:bg-background-dark border-2 border-primary shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            <p className="text-secondary-text-light dark:text-secondary-text-dark text-base font-medium">
              Tarefas
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleNewTask} className="h-7 gap-1 text-sm font-semibold">
            <Plus className="h-3 w-3" />
            Nova
          </Button>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-primary-text-light dark:text-primary-text-dark">
            {pendingTasks.length}
          </span>
          <span className="text-sm text-muted-foreground font-semibold">pendente{pendingTasks.length !== 1 ? "s" : ""}</span>
          {overdueTasks.length > 0 && <Badge variant="destructive" className="text-base gap-1 whitespace-nowrap">
              <AlertTriangle className="h-4 w-4" />
              {overdueTasks.length} atrasada{overdueTasks.length !== 1 ? "s" : ""}
            </Badge>}
        </div>

        {/* Quick Task List - show max 3 */}
        {pendingTasks.length > 0 && <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
            {pendingTasks.slice(0, 3).map(task => {
          const StatusIcon = statusConfig[task.status].icon;
          const overdue = isOverdue(task.due_date);
          return <div key={task.id} className={cn("flex items-center gap-2 p-2 rounded-md border text-sm cursor-pointer hover:bg-muted/50 transition-colors", overdue && "border-red-200 bg-red-50/50")} onClick={() => handleTaskClick(task)}>
                  <StatusIcon className={cn("h-4 w-4 flex-shrink-0", task.status === "in_progress" ? "text-blue-500" : "text-muted-foreground")} />
                  <span className="truncate flex-1 font-medium text-base">{task.title}</span>
                  {task.due_date && <span className={cn("text-sm font-medium", overdue ? "text-red-600" : "text-muted-foreground")}>
                      {format(new Date(task.due_date), "dd/MM", {
                locale: ptBR
              })}
                    </span>}
                </div>;
        })}
            {pendingTasks.length > 3 && <p className="text-xs text-muted-foreground text-center py-1">
                +{pendingTasks.length - 3} mais
              </p>}
          </div>}

        {tasks.length === 0 && <p className="text-sm text-muted-foreground">
            Nenhuma tarefa vinculada
          </p>}
      </div>

      <TaskDetailDrawer task={selectedTask} open={detailDrawerOpen} onOpenChange={setDetailDrawerOpen} onEdit={handleEditTask} />

      <TaskModal open={modalOpen} onClose={handleCloseModal} task={editingTask} defaultVagaId={defaultVagaId} />
    </>;
}