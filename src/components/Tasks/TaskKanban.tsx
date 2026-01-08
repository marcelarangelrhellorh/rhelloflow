import { useState } from "react";
import { Task, TaskStatus, MeetingOutcome, useUpdateTask } from "@/hooks/useTasks";
import TaskCard from "./TaskCard";
import { Card } from "@/components/ui/card";
import MeetingOutcomeModal from "./MeetingOutcomeModal";

interface TaskKanbanProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onTaskClick?: (task: Task) => void;
  entityType?: "tasks" | "meetings";
}

// Colunas para tarefas
const taskColumns: {
  id: string;
  label: string;
  color: string;
}[] = [
  { id: "to_do", label: "A Fazer", color: "border-t-blue-500" },
  { id: "in_progress", label: "Em Andamento", color: "border-t-yellow-500" },
  { id: "done", label: "Concluída", color: "border-t-green-500" },
];

// Colunas para reuniões
const meetingColumns: {
  id: string;
  label: string;
  color: string;
}[] = [
  { id: "scheduled", label: "Agendadas", color: "border-t-blue-500" },
  { id: "completed", label: "Concluídas", color: "border-t-green-500" },
  { id: "cancelled", label: "Canceladas", color: "border-t-slate-500" },
  { id: "no_show", label: "No Show", color: "border-t-red-500" },
];

// Determina em qual coluna uma reunião deve aparecer
const getMeetingColumn = (task: Task): string => {
  if (task.status !== 'done') return 'scheduled';
  return task.meeting_outcome || 'completed';
};

export default function TaskKanban({
  tasks,
  onEdit,
  onDelete,
  onTaskClick,
  entityType = "tasks"
}: TaskKanbanProps) {
  const updateTask = useUpdateTask();
  const [outcomeModalOpen, setOutcomeModalOpen] = useState(false);
  const [pendingDropTask, setPendingDropTask] = useState<Task | null>(null);

  const columns = entityType === "meetings" ? meetingColumns : taskColumns;

  const handleToggleComplete = async (task: Task, meetingOutcome?: MeetingOutcome) => {
    const newStatus: TaskStatus = task.status === 'done' ? 'to_do' : 'done';
    await updateTask.mutateAsync({
      id: task.id,
      status: newStatus,
      meeting_outcome: meetingOutcome || (newStatus === 'to_do' ? null : task.meeting_outcome),
    });
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) return;

    if (entityType === "meetings") {
      // Lógica para reuniões
      const currentColumn = getMeetingColumn(task);
      if (currentColumn === columnId) return;

      let newStatus: TaskStatus;
      let newOutcome: MeetingOutcome | null;

      switch (columnId) {
        case 'scheduled':
          newStatus = 'to_do';
          newOutcome = null;
          break;
        case 'completed':
          newStatus = 'done';
          newOutcome = 'completed';
          break;
        case 'cancelled':
          newStatus = 'done';
          newOutcome = 'cancelled';
          break;
        case 'no_show':
          newStatus = 'done';
          newOutcome = 'no_show';
          break;
        default:
          return;
      }

      await updateTask.mutateAsync({
        id: taskId,
        status: newStatus,
        meeting_outcome: newOutcome,
      });
    } else {
      // Lógica para tarefas (existente)
      const status = columnId as TaskStatus;
      if (task.status === status) return;

      // If dropping a meeting into "done" column, show outcome modal
      if (status === 'done' && task.task_type === 'meeting') {
        setPendingDropTask(task);
        setOutcomeModalOpen(true);
      } else {
        await updateTask.mutateAsync({
          id: taskId,
          status,
          meeting_outcome: status !== 'done' ? null : task.meeting_outcome,
        });
      }
    }
  };

  const handleOutcomeSelect = async (outcome: MeetingOutcome) => {
    if (pendingDropTask) {
      await updateTask.mutateAsync({
        id: pendingDropTask.id,
        status: 'done',
        meeting_outcome: outcome,
      });
      setPendingDropTask(null);
    }
    setOutcomeModalOpen(false);
  };

  const getColumnTasks = (columnId: string) => {
    if (entityType === "meetings") {
      return tasks.filter(task => getMeetingColumn(task) === columnId);
    }
    return tasks.filter(task => task.status === columnId);
  };

  return (
    <>
      <div className={`grid grid-cols-1 gap-6 ${entityType === "meetings" ? "md:grid-cols-4" : "md:grid-cols-3"} max-w-6xl`}>
        {columns.map(column => {
          const columnTasks = getColumnTasks(column.id);
          return (
            <div 
              key={column.id} 
              className="flex flex-col gap-3" 
              onDragOver={handleDragOver} 
              onDrop={e => handleDrop(e, column.id)}
            >
              <Card className={`p-4 border-t-4 ${column.color}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base">{column.label}</h3>
                  <span className="text-muted-foreground bg-muted px-3 py-1 rounded text-base font-semibold">
                    {columnTasks.length}
                  </span>
                </div>
              </Card>

              <div className="space-y-3">
                {columnTasks.map(task => (
                  <div 
                    key={task.id} 
                    draggable 
                    onDragStart={e => handleDragStart(e, task.id)} 
                    className="cursor-move"
                  >
                    <TaskCard 
                      task={task} 
                      onEdit={onEdit} 
                      onDelete={onDelete} 
                      onToggleComplete={handleToggleComplete} 
                      onCardClick={onTaskClick} 
                      draggable 
                    />
                  </div>
                ))}
                {columnTasks.length === 0 && (
                  <Card className="p-8 text-center text-muted-foreground border-dashed text-base">
                    {entityType === "meetings" ? "Nenhuma reunião" : "Nenhuma tarefa"}
                  </Card>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Meeting Outcome Modal for drag & drop (only for tasks mode) */}
      <MeetingOutcomeModal
        open={outcomeModalOpen}
        onOpenChange={(open) => {
          setOutcomeModalOpen(open);
          if (!open) setPendingDropTask(null);
        }}
        onSelect={handleOutcomeSelect}
        isLoading={updateTask.isPending}
      />
    </>
  );
}
