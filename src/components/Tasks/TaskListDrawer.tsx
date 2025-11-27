import { Task } from "@/hooks/useTasks";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, User, Briefcase, Building2, Users } from "lucide-react";

interface TaskListDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

const priorityConfig = {
  low: { label: "Baixa", className: "bg-gray-100 text-gray-700" },
  medium: { label: "Média", className: "bg-blue-100 text-blue-700" },
  high: { label: "Alta", className: "bg-orange-100 text-orange-700" },
  urgent: { label: "Urgente", className: "bg-red-100 text-red-700" },
};

const statusConfig = {
  to_do: { label: "A Fazer", className: "bg-gray-100 text-gray-700" },
  in_progress: { label: "Em Andamento", className: "bg-blue-100 text-blue-700" },
  done: { label: "Concluída", className: "bg-green-100 text-green-700" },
};

export default function TaskListDrawer({
  open,
  onClose,
  title,
  tasks,
  onTaskClick,
}: TaskListDrawerProps) {
  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && tasks[0]?.status !== "done";
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl font-bold">{title}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {tasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma tarefa encontrada
            </p>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onTaskClick?.(task)}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-base">{task.title}</h4>
                  <div className="flex gap-1 flex-shrink-0">
                    <Badge className={priorityConfig[task.priority].className}>
                      {priorityConfig[task.priority].label}
                    </Badge>
                    <Badge className={statusConfig[task.status].className}>
                      {statusConfig[task.status].label}
                    </Badge>
                  </div>
                </div>

                {task.assignee && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium">
                      {task.assignee.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{task.assignee.full_name}</span>
                  </div>
                )}

                {task.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {task.description}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {task.due_date && (
                    <div className={`flex items-center gap-1 ${isOverdue(task.due_date) ? "text-red-600 font-medium" : ""}`}>
                      <Calendar className="h-4 w-4" />
                      {format(new Date(task.due_date), "dd/MM/yyyy", { locale: ptBR })}
                      {isOverdue(task.due_date) && " (Atrasada)"}
                    </div>
                  )}

                  {task.vaga && (
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      {task.vaga.titulo}
                    </div>
                  )}

                  {task.empresa && (
                    <div className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {task.empresa.nome}
                    </div>
                  )}

                  {task.candidato && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {task.candidato.nome_completo}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
