import { useState } from 'react';
import { Calendar, Link2, Unlink, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function GoogleCalendarSettings() {
  const { isConnected, isLoading, lastSync, connectCalendar, disconnectCalendar, refreshStatus } = useGoogleCalendar();
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

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Google Calendar</CardTitle>
          </div>
          <CardDescription className="text-sm">
            Sincronize suas tarefas com o Google Calendar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700">Conectado</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Desconectado</span>
                </>
              )}
            </div>
            {isConnected && (
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshStatus}
                className="h-8 px-2"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Last Sync */}
          {isConnected && lastSync && (
            <div className="text-xs text-muted-foreground">
              Última sincronização: {formatDistanceToNow(new Date(lastSync), { addSuffix: true, locale: ptBR })}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {isConnected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDisconnectDialog(true)}
                className="flex-1 text-destructive hover:text-destructive"
              >
                <Unlink className="h-4 w-4 mr-2" />
                Desconectar
              </Button>
            ) : (
              <Button
                onClick={handleConnect}
                size="sm"
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Link2 className="h-4 w-4 mr-2" />
                Conectar Google Calendar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Disconnect Confirmation Dialog */}
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
