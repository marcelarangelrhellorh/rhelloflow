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
  className?: string;
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
  vagaTitulo,
  className
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
  const completedTasks = tasks.filter(t => t.status === "done");
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
      <div className={cn("flex flex-col gap-3 rounded-lg p-6 bg-white dark:bg-background-dark border border-gray-200 dark:border-secondary-text-light/20 shadow-sm", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="text-primary w-[30px] h-[30px]" />
            <p className="text-secondary-text-light dark:text-secondary-text-dark font-semibold text-xl">
              Tarefas
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleNewTask} className="h-8 gap-1 px-4 text-sm font-semibold bg-[#00141D] text-white hover:bg-[#00141D]/90 border-[#00141D] rounded-full">
            <Plus className="h-3 w-3" />
            Nova
          </Button>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-primary-text-light dark:text-primary-text-dark">
            {tasks.length}
          </span>
          <span className="text-muted-foreground font-semibold text-xs">tarefa{tasks.length !== 1 ? "s" : ""}</span>
          {overdueTasks.length > 0 && <Badge variant="destructive" className="text-base gap-1 whitespace-nowrap px-[10px] mx-[100px]">
              <AlertTriangle className="h-4 w-4" />
              {overdueTasks.length} atrasada{overdueTasks.length !== 1 ? "s" : ""}
            </Badge>}
        </div>

        {/* Task List - show all tasks */}
        {tasks.length > 0 && <div className="space-y-2 mt-2 max-h-80 overflow-y-auto">
            {tasks.map(task => {
          const StatusIcon = statusConfig[task.status].icon;
          const overdue = isOverdue(task.due_date) && task.status !== "done";
          const isDone = task.status === "done";
          return <div key={task.id} className={cn("flex items-center gap-2 p-2 rounded-md border text-sm cursor-pointer hover:bg-muted/50 transition-colors", overdue && "border-red-200 bg-red-50/50", isDone && "opacity-60 bg-muted/30")} onClick={() => handleTaskClick(task)}>
                  <StatusIcon className={cn("h-4 w-4 flex-shrink-0", task.status === "done" ? "text-green-500" : task.status === "in_progress" ? "text-blue-500" : "text-muted-foreground")} />
                  <span className={cn("truncate flex-1 font-medium text-base", isDone && "line-through")}>{task.title}</span>
                  {task.due_date && <span className={cn("text-sm font-medium", overdue ? "text-red-600" : "text-muted-foreground")}>
                      {format(new Date(task.due_date), "dd/MM", {
                locale: ptBR
              })}
                    </span>}
                </div>;
        })}
          </div>}

        {tasks.length === 0 && <p className="text-sm text-muted-foreground">
            Nenhuma tarefa vinculada
          </p>}
      </div>

      <TaskDetailDrawer 
        task={selectedTask} 
        open={detailDrawerOpen} 
        onOpenChange={setDetailDrawerOpen} 
        onEdit={handleEditTask}
        onDelete={() => {}}
        onToggleComplete={() => {}}
      />

      <TaskModal open={modalOpen} onClose={handleCloseModal} task={editingTask} defaultVagaId={defaultVagaId} />
    </>;
}