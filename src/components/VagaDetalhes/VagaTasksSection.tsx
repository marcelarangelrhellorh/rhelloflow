import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckSquare, Plus, ChevronDown, ChevronUp, Clock, CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useVagaTasks } from "@/hooks/data/useVagaTasks";
import { useUpdateTask, Task, TaskStatus, TaskPriority } from "@/hooks/useTasks";
import TaskModal from "@/components/Tasks/TaskModal";

interface VagaTasksSectionProps {
  vagaId: string;
  vagaTitulo: string;
}

const priorityConfig: Record<TaskPriority, { label: string; class: string }> = {
  low: { label: "Baixa", class: "bg-gray-100 text-gray-700" },
  medium: { label: "Média", class: "bg-blue-100 text-blue-700" },
  high: { label: "Alta", class: "bg-orange-100 text-orange-700" },
  urgent: { label: "Urgente", class: "bg-red-100 text-red-700" },
};

const statusConfig: Record<TaskStatus, { label: string; icon: typeof Circle }> = {
  to_do: { label: "A Fazer", icon: Circle },
  in_progress: { label: "Em Andamento", icon: Clock },
  done: { label: "Concluída", icon: CheckCircle2 },
};

export function VagaTasksSection({ vagaId, vagaTitulo }: VagaTasksSectionProps) {
  const { data: tasks = [], isLoading } = useVagaTasks(vagaId);
  const updateTask = useUpdateTask();
  const [isOpen, setIsOpen] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultVagaId, setDefaultVagaId] = useState<string | null>(null);

  const pendingTasks = tasks.filter((t) => t.status !== "done");
  const completedTasks = tasks.filter((t) => t.status === "done");

  const handleQuickComplete = async (task: Task) => {
    await updateTask.mutateAsync({
      id: task.id,
      status: task.status === "done" ? "to_do" : "done",
    });
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setDefaultVagaId(null);
    setModalOpen(true);
  };

  const handleNewTask = () => {
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
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 animate-pulse rounded bg-muted" />
            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-sm">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardContent className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Tarefas</h3>
                  {tasks.length > 0 && (
                    <Badge variant="secondary" className="text-sm">
                      {pendingTasks.length} pendente{pendingTasks.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNewTask();
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Nova
                  </Button>
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardContent>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-2">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma tarefa vinculada a esta vaga
                </p>
              ) : (
                <>
                  {/* Pending Tasks */}
                  {pendingTasks.map((task) => {
                    const StatusIcon = statusConfig[task.status].icon;
                    const overdue = isOverdue(task.due_date);

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50",
                          overdue && "border-red-200 bg-red-50/50"
                        )}
                        onClick={() => handleEditTask(task)}
                      >
                        <button
                          className="flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickComplete(task);
                          }}
                        >
                          <StatusIcon
                            className={cn(
                              "h-5 w-5 transition-colors",
                              task.status === "in_progress"
                                ? "text-blue-500"
                                : "text-muted-foreground hover:text-primary"
                            )}
                          />
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {task.due_date && (
                              <span
                                className={cn(
                                  "text-xs flex items-center gap-1",
                                  overdue ? "text-red-600 font-medium" : "text-muted-foreground"
                                )}
                              >
                                {overdue && <AlertTriangle className="h-3 w-3" />}
                                {format(new Date(task.due_date), "dd/MM", { locale: ptBR })}
                              </span>
                            )}
                            {task.assignee && (
                              <span className="text-xs text-muted-foreground">
                                {task.assignee.full_name}
                              </span>
                            )}
                          </div>
                        </div>

                        <Badge className={cn("text-xs", priorityConfig[task.priority].class)}>
                          {priorityConfig[task.priority].label}
                        </Badge>
                      </div>
                    );
                  })}

                  {/* Completed Tasks - collapsed by default */}
                  {completedTasks.length > 0 && (
                    <Collapsible>
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>{completedTasks.length} concluída{completedTasks.length !== 1 ? "s" : ""}</span>
                          <ChevronDown className="h-4 w-4 ml-auto" />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="space-y-2 pt-2">
                          {completedTasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                              onClick={() => handleEditTask(task)}
                            >
                              <button
                                className="flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickComplete(task);
                                }}
                              >
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              </button>
                              <p className="font-medium text-sm text-muted-foreground line-through truncate flex-1">
                                {task.title}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <TaskModal
        open={modalOpen}
        onClose={handleCloseModal}
        task={editingTask}
        defaultVagaId={defaultVagaId}
      />
    </>
  );
}
