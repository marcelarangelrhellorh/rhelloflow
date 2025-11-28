import { useState } from 'react';
import { Calendar, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Task } from '@/hooks/useTasks';
import { useTaskSync } from '@/hooks/useTaskSync';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SyncTaskToCalendarProps {
  task: Task;
  variant?: 'icon' | 'button';
  className?: string;
}

export default function SyncTaskToCalendar({ task, variant = 'icon', className }: SyncTaskToCalendarProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const { syncTask } = useTaskSync();
  const { isConnected, isLoading: calendarLoading } = useGoogleCalendar();

  if (!isConnected || calendarLoading) {
    return null;
  }

  const handleSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!task.due_date) {
      toast.error('A tarefa precisa ter uma data de vencimento para sincronizar');
      return;
    }

    if (!task.sync_enabled) {
      toast.info('Sincronização desabilitada para esta tarefa');
      return;
    }

    setIsSyncing(true);
    
    const action = task.google_calendar_event_id ? 'update' : 'create';
    const result = await syncTask(task.id, action);
    
    if (!result.success && result.error) {
      toast.error(result.error);
    }
    
    setIsSyncing(false);
  };

  const handleOpenInCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.google_calendar_event_id) {
      window.open(
        `https://calendar.google.com/calendar/r/eventedit/${task.google_calendar_event_id}`,
        '_blank'
      );
    }
  };

  if (variant === 'button') {
    return (
      <div className={cn("flex gap-2", className)}>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSync}
          disabled={isSyncing || !task.sync_enabled || !task.due_date}
          className="gap-2"
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Calendar className="h-4 w-4" />
          )}
          {task.google_calendar_synced ? 'Atualizar no Calendar' : 'Adicionar ao Calendar'}
        </Button>
        {task.google_calendar_event_id && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleOpenInCalendar}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Ver no Calendar
          </Button>
        )}
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSync}
          disabled={isSyncing || !task.sync_enabled || !task.due_date}
          className={cn("px-2", className)}
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          ) : task.google_calendar_synced ? (
            <Calendar className="h-4 w-4 text-green-500" />
          ) : (
            <Calendar className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {!task.due_date 
          ? 'Defina uma data de vencimento primeiro'
          : !task.sync_enabled
          ? 'Sincronização desabilitada'
          : task.google_calendar_synced
          ? 'Sincronizado - Clique para atualizar'
          : 'Adicionar ao Google Calendar'}
      </TooltipContent>
    </Tooltip>
  );
}
