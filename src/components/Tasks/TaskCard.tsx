import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, CheckCircle2, Clock, User, Briefcase, Building2, UserCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Task } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";
import SyncTaskToCalendar from "./SyncTaskToCalendar";
import { TaskSyncIndicator } from "./TaskSyncIndicator";
interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (task: Task) => void;
  onCardClick?: (task: Task) => void;
  draggable?: boolean;
}
const priorityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800"
};
const priorityLabels = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente"
};
const statusLabels = {
  to_do: "A Fazer",
  in_progress: "Em Andamento",
  done: "Concluída"
};
const TaskCard = React.memo(function TaskCard({
  task,
  onEdit,
  onDelete,
  onToggleComplete,
  onCardClick,
  draggable = false
}: TaskCardProps) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };
  return <Card className={cn("p-4 hover:shadow-md transition-shadow cursor-pointer max-w-2xl", task.status === 'done' && "opacity-60")} draggable={draggable} onClick={() => onCardClick?.(task)}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 flex items-center gap-2">
            <h3 className={cn("font-semibold text-base", task.status === 'done' && "line-through")}>
              {task.title}
            </h3>
            <TaskSyncIndicator isSynced={task.google_calendar_synced} lastSync={task.google_calendar_last_sync} syncEnabled={task.sync_enabled} />
          </div>
          <Badge className={`text-sm font-medium ${priorityColors[task.priority]}`}>
            {priorityLabels[task.priority]}
          </Badge>
        </div>

        {/* Meta information */}
        <div className="space-y-2 text-sm text-muted-foreground">
          {task.due_date && <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className={`text-sm ${isOverdue ? "text-red-600 font-semibold" : ""}`}>
                {format(new Date(task.due_date), "dd 'de' MMMM 'às' HH:mm", {
              locale: ptBR
            })}
              </span>
              {isOverdue && <Badge variant="destructive" className="text-sm font-medium">Atrasada</Badge>}
            </div>}

          {task.assignee && <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6 bg-[#00141d]">
                <AvatarFallback className="text-[#fffdf6] text-xs">
                  {getInitials(task.assignee.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{task.assignee.full_name}</span>
            </div>}

          {task.vaga && <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              <span className="truncate text-sm">{task.vaga.titulo}</span>
            </div>}

          {task.empresa && <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="truncate text-sm">{task.empresa.nome}</span>
            </div>}

          {task.candidato && <div className="flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              <span className="truncate text-sm">{task.candidato.nome_completo}</span>
            </div>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t" onClick={e => e.stopPropagation()}>
          <Button size="sm" variant={task.status === 'done' ? "outline" : "default"} className={cn("h-8 text-sm", task.status !== 'done' ? "bg-[#00141d] hover:bg-[#00141d]/90 text-white font-semibold" : "")} onClick={() => onToggleComplete(task)}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            {task.status === 'done' ? 'Reabrir' : 'Concluir'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onEdit(task)} className="h-8 text-sm font-medium">
            Editar
          </Button>
          <SyncTaskToCalendar task={task} />
          <Button size="sm" variant="ghost" onClick={() => onDelete(task.id)} className="h-8 text-sm text-red-600 font-medium">
            Excluir
          </Button>
        </div>
      </div>
    </Card>;
});

export default TaskCard;