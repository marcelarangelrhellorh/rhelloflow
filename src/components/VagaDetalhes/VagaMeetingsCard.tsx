import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Task } from "@/hooks/useTasks";
import MeetingModal from "@/components/Tasks/MeetingModal";
import { TaskDetailDrawer } from "./TaskDetailDrawer";

interface VagaMeetingsCardProps {
  vagaId: string;
  vagaTitulo: string;
  className?: string;
}

const statusConfig = {
  to_do: { icon: Clock, label: "Agendada" },
  in_progress: { icon: Clock, label: "Em andamento" },
  done: { icon: CheckCircle2, label: "Concluída" },
};

export function VagaMeetingsCard({
  vagaId,
  vagaTitulo,
  className,
}: VagaMeetingsCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Task | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Task | null>(null);

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["vaga-meetings", vagaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("vaga_id", vagaId)
        .eq("task_type", "meeting")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data as Task[];
    },
  });

  const pendingMeetings = meetings.filter((m) => m.status !== "done");
  const overdueMeetings = pendingMeetings.filter(
    (m) =>
      m.due_date &&
      isPast(new Date(m.due_date)) &&
      !isToday(new Date(m.due_date))
  );

  const handleMeetingClick = (meeting: Task) => {
    setSelectedMeeting(meeting);
    setDetailDrawerOpen(true);
  };

  const handleEditMeeting = (meeting: Task) => {
    setEditingMeeting(meeting);
    setModalOpen(true);
  };

  const handleNewMeeting = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMeeting(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingMeeting(null);
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return isPast(new Date(dueDate)) && !isToday(new Date(dueDate));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 rounded-lg p-6 bg-white dark:bg-background-dark border border-gray-200 dark:border-secondary-text-light/20 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          <div className="h-6 w-16 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "flex flex-col gap-3 rounded-lg p-6 bg-white dark:bg-background-dark border border-gray-200 dark:border-secondary-text-light/20 shadow-sm",
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="text-amber-500 w-[30px] h-[30px]" />
            <p className="text-secondary-text-light dark:text-secondary-text-dark font-semibold text-xl">
              Reuniões
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleNewMeeting}
            className="h-8 gap-1 px-4 text-sm font-semibold bg-[#00141D] text-white hover:bg-[#00141D]/90 border-[#00141D] rounded-full"
          >
            <Plus className="h-3 w-3" />
            Nova
          </Button>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-primary-text-light dark:text-primary-text-dark">
            {meetings.length}
          </span>
          <span className="text-muted-foreground font-semibold text-xs">
            {meetings.length === 1 ? "reunião" : "reuniões"}
          </span>
          {overdueMeetings.length > 0 && (
            <Badge
              variant="destructive"
              className="text-base gap-1 whitespace-nowrap px-[10px]"
            >
              <AlertTriangle className="h-4 w-4" />
              {overdueMeetings.length} atrasada
              {overdueMeetings.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Meetings List */}
        {meetings.length > 0 && (
          <div className="space-y-2 mt-2 max-h-80 overflow-y-auto">
            {meetings.map((meeting) => {
              const StatusIcon = statusConfig[meeting.status].icon;
              const overdue =
                isOverdue(meeting.due_date) && meeting.status !== "done";
              const isDone = meeting.status === "done";

              return (
                <div
                  key={meeting.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md border text-sm cursor-pointer hover:bg-muted/50 transition-colors",
                    overdue && "border-red-200 bg-red-50/50",
                    isDone && "opacity-60 bg-muted/30"
                  )}
                  onClick={() => handleMeetingClick(meeting)}
                >
                  <StatusIcon
                    className={cn(
                      "h-4 w-4 flex-shrink-0",
                      meeting.status === "done"
                        ? "text-green-500"
                        : meeting.status === "in_progress"
                        ? "text-blue-500"
                        : "text-muted-foreground"
                    )}
                  />
                  <span
                    className={cn(
                      "truncate flex-1 font-medium text-base",
                      isDone && "line-through"
                    )}
                  >
                    {meeting.title}
                  </span>
                  {meeting.due_date && (
                    <span
                      className={cn(
                        "text-sm font-medium",
                        overdue ? "text-red-600" : "text-muted-foreground"
                      )}
                    >
                      {format(new Date(meeting.due_date), "dd/MM HH:mm", {
                        locale: ptBR,
                      })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {meetings.length === 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-500">
            Nenhuma reunião agendada
          </p>
        )}
      </div>

      <TaskDetailDrawer
        task={selectedMeeting}
        open={detailDrawerOpen}
        onOpenChange={setDetailDrawerOpen}
        onEdit={handleEditMeeting}
        onDelete={() => {}}
        onToggleComplete={() => {}}
      />

      <MeetingModal
        open={modalOpen}
        onClose={handleCloseModal}
        task={editingMeeting}
        defaultVagaId={vagaId}
      />
    </>
  );
}
