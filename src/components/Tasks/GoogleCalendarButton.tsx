import { useState } from 'react';
import { Calendar, Link2, Unlink, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useTaskSync } from '@/hooks/useTaskSync';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function GoogleCalendarButton() {
  const { isConnected, isLoading, lastSync, connectCalendar, disconnectCalendar } = useGoogleCalendar();
  const { syncAllTasks, isSyncing } = useTaskSync();
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConnect = async () => {
    await connectCalendar();
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    await disconnectCalendar();
    setIsDisconnecting(false);
    setShowDisconnectDialog(false);
  };

  const handleSyncAll = async () => {
    await syncAllTasks();
  };

  if (isLoading) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Calendar className="h-4 w-4" />
        <span className="hidden sm:inline">Carregando...</span>
      </Button>
    );
  }

  if (isConnected) {
    return (
      <>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 border-green-200 bg-green-50 hover:bg-green-100 text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              <span className="hidden sm:inline">Google Calendar</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="font-semibold">Google Calendar</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Conectado
              </div>
              {lastSync && (
                <p className="text-xs text-muted-foreground">
                  Última sincronização: {formatDistanceToNow(new Date(lastSync), { addSuffix: true, locale: ptBR })}
                </p>
              )}
              <div className="space-y-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncAll}
                  disabled={isSyncing}
                  className="w-full"
                >
                  {isSyncing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sincronizar Todas as Tarefas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDisconnectDialog(true)}
                  className="w-full text-destructive hover:text-destructive"
                >
                  <Unlink className="h-4 w-4 mr-2" />
                  Desconectar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desconectar Google Calendar?</AlertDialogTitle>
              <AlertDialogDescription>
                Isso irá remover a conexão com o Google Calendar. Suas tarefas não serão mais sincronizadas automaticamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDisconnecting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDisconnecting ? 'Desconectando...' : 'Desconectar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <Button variant="outline" onClick={handleConnect} className="gap-2">
      <Link2 className="h-4 w-4" />
      <span className="hidden sm:inline">Google Calendar</span>
    </Button>
  );
}
