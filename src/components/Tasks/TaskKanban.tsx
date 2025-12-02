import { Task, TaskStatus, useUpdateTask } from "@/hooks/useTasks";
import TaskCard from "./TaskCard";
import { Card } from "@/components/ui/card";
interface TaskKanbanProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onTaskClick?: (task: Task) => void;
}
const columns: {
  status: TaskStatus;
  label: string;
  color: string;
}[] = [{
  status: "to_do",
  label: "A Fazer",
  color: "border-t-blue-500"
}, {
  status: "in_progress",
  label: "Em Andamento",
  color: "border-t-yellow-500"
}, {
  status: "done",
  label: "Concluída",
  color: "border-t-green-500"
}];
export default function TaskKanban({
  tasks,
  onEdit,
  onDelete,
  onTaskClick
}: TaskKanbanProps) {
  const updateTask = useUpdateTask();
  const handleToggleComplete = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'done' ? 'to_do' : 'done';
    await updateTask.mutateAsync({
      id: task.id,
      status: newStatus
    });
  };
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const handleDrop = async (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== status) {
      await updateTask.mutateAsync({
        id: taskId,
        status
      });
    }
  };
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl">
      {columns.map(column => {
      const columnTasks = tasks.filter(task => task.status === column.status);
      return <div key={column.status} className="flex flex-col gap-3" onDragOver={handleDragOver} onDrop={e => handleDrop(e, column.status)}>
            <Card className={`p-4 border-t-4 ${column.color}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base">{column.label}</h3>
                <span className="text-muted-foreground bg-muted px-3 py-1 rounded text-base font-semibold">
                  {columnTasks.length}
                </span>
              </div>
            </Card>

            <div className="space-y-3">
              {columnTasks.map(task => <div key={task.id} draggable onDragStart={e => handleDragStart(e, task.id)} className="cursor-move">
                  <TaskCard task={task} onEdit={onEdit} onDelete={onDelete} onToggleComplete={handleToggleComplete} onCardClick={onTaskClick} draggable />
                </div>)}
              {columnTasks.length === 0 && <Card className="p-8 text-center text-muted-foreground border-dashed text-base">
                  Nenhuma tarefa
                </Card>}
            </div>
          </div>;
    })}
    </div>;
}