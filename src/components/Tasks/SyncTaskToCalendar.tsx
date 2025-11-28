import { useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { toast } from 'sonner';
import { Task } from '@/hooks/useTasks';

interface SyncTaskToCalendarProps {
  task: Task;
  variant?: 'icon' | 'button';
}

export default function SyncTaskToCalendar({ task, variant = 'icon' }: SyncTaskToCalendarProps) {
  const { isConnected, createEvent, isLoading: calendarLoading } = useGoogleCalendar();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isConnected) {
      toast.error('Conecte seu Google Calendar primeiro nas configurações');
      return;
    }

    if (!task.due_date) {
      toast.error('A tarefa precisa ter uma data de vencimento para sincronizar');
      return;
    }

    setIsSyncing(true);
    
    try {
      const startDateTime = new Date(task.due_date);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration

      const eventData = {
        summary: task.title,
        description: task.description || `Tarefa: ${task.title}\nPrioridade: ${task.priority}\nStatus: ${task.status}`,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 30 },
            { method: 'email', minutes: 60 },
          ],
        },
      };

      const result = await createEvent(eventData);
      
      if (result) {
        toast.success('Tarefa sincronizada com o Google Calendar');
      }
    } catch (error) {
      console.error('Error syncing task:', error);
      toast.error('Erro ao sincronizar com o Google Calendar');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  if (variant === 'button') {
    return (
      <Button
        onClick={handleSync}
        disabled={isSyncing || calendarLoading || !task.due_date}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        {isSyncing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Calendar className="h-4 w-4" />
        )}
        Adicionar ao Calendário
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={handleSync}
          disabled={isSyncing || calendarLoading || !task.due_date}
          variant="ghost"
          size="icon"
          className="h-8 w-8"
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Calendar className="h-4 w-4 text-muted-foreground hover:text-primary" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {task.due_date ? 'Adicionar ao Google Calendar' : 'Defina uma data de vencimento primeiro'}
      </TooltipContent>
    </Tooltip>
  );
}
