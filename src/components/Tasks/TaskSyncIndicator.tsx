import { CheckCircle2, RefreshCw, AlertCircle, Calendar } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TaskSyncIndicatorProps {
  isSynced: boolean;
  isSyncing?: boolean;
  lastSync?: string | null;
  hasError?: boolean;
  syncEnabled?: boolean;
  className?: string;
}

export function TaskSyncIndicator({
  isSynced,
  isSyncing = false,
  lastSync,
  hasError = false,
  syncEnabled = true,
  className,
}: TaskSyncIndicatorProps) {
  if (!syncEnabled) {
    return null;
  }

  if (isSyncing) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <RefreshCw className={cn("h-4 w-4 text-blue-500 animate-spin", className)} />
        </TooltipTrigger>
        <TooltipContent>
          <p>Sincronizando com Google Calendar...</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (hasError) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertCircle className={cn("h-4 w-4 text-destructive", className)} />
        </TooltipTrigger>
        <TooltipContent>
          <p>Erro na sincronização</p>
          <p className="text-xs text-muted-foreground">Clique para tentar novamente</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (isSynced) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <CheckCircle2 className={cn("h-4 w-4 text-green-500", className)} />
        </TooltipTrigger>
        <TooltipContent>
          <p>Sincronizado com Google Calendar</p>
          {lastSync && (
            <p className="text-xs text-muted-foreground">
              Última sync: {formatDistanceToNow(new Date(lastSync), { addSuffix: true, locale: ptBR })}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Calendar className={cn("h-4 w-4 text-muted-foreground opacity-50", className)} />
      </TooltipTrigger>
      <TooltipContent>
        <p>Não sincronizado</p>
      </TooltipContent>
    </Tooltip>
  );
}
