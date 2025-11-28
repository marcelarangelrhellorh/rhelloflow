import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useGoogleCalendar } from './useGoogleCalendar';

interface SyncResult {
  success: boolean;
  google_event_id?: string;
  google_task_id?: string;
  event_link?: string;
  task_link?: string;
  error?: string;
}

interface BulkSyncResult {
  success: boolean;
  results?: {
    synced: number;
    errors: number;
    skipped: number;
  };
  errors?: string[];
}

export function useTaskSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  const { isConnected, refreshStatus } = useGoogleCalendar();

  // Sync task to Google Calendar (for meetings)
  const syncTask = useCallback(async (
    taskId: string, 
    action: 'create' | 'update' | 'delete'
  ): Promise<SyncResult> => {
    if (!isConnected) {
      return { success: false, error: 'Google não conectado' };
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-task-to-calendar', {
        body: { task_id: taskId, action },
      });

      if (error) {
        const errorMsg = error.message || 'Erro na sincronização com Calendar';
        setSyncErrors(prev => [...prev.slice(-4), errorMsg]);
        return { success: false, error: errorMsg };
      }

      if (data.error) {
        setSyncErrors(prev => [...prev.slice(-4), data.error]);
        return { success: false, error: data.error };
      }

      return {
        success: true,
        google_event_id: data.google_event_id,
        event_link: data.event_link,
      };
    } catch (err: any) {
      const errorMsg = err.message || 'Erro inesperado na sincronização';
      setSyncErrors(prev => [...prev.slice(-4), errorMsg]);
      return { success: false, error: errorMsg };
    } finally {
      setIsSyncing(false);
    }
  }, [isConnected]);

  // Sync task to Google Tasks (for tasks)
  const syncTaskToGoogleTasks = useCallback(async (
    taskId: string, 
    action: 'create' | 'update' | 'delete'
  ): Promise<SyncResult> => {
    if (!isConnected) {
      return { success: false, error: 'Google não conectado' };
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-task-to-google-tasks', {
        body: { task_id: taskId, action },
      });

      if (error) {
        const errorMsg = error.message || 'Erro na sincronização com Tasks';
        setSyncErrors(prev => [...prev.slice(-4), errorMsg]);
        return { success: false, error: errorMsg };
      }

      if (data.error) {
        setSyncErrors(prev => [...prev.slice(-4), data.error]);
        return { success: false, error: data.error };
      }

      return {
        success: true,
        google_task_id: data.google_task_id,
        task_link: data.task_link,
      };
    } catch (err: any) {
      const errorMsg = err.message || 'Erro inesperado na sincronização';
      setSyncErrors(prev => [...prev.slice(-4), errorMsg]);
      return { success: false, error: errorMsg };
    } finally {
      setIsSyncing(false);
    }
  }, [isConnected]);

  const syncAllTasks = useCallback(async (): Promise<BulkSyncResult> => {
    if (!isConnected) {
      toast.error('Google não conectado');
      return { success: false };
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('bulk-sync-tasks', {
        body: { sync_direction: 'to_calendar' },
      });

      if (error) {
        toast.error('Erro na sincronização em massa');
        return { success: false };
      }

      if (data.success) {
        toast.success(`Sincronização concluída: ${data.results.synced} itens sincronizados`);
        if (data.results.errors > 0) {
          toast.warning(`${data.results.errors} itens com erro`);
        }
      }

      return {
        success: data.success,
        results: data.results,
        errors: data.errors,
      };
    } catch (err: any) {
      toast.error('Erro na sincronização');
      return { success: false };
    } finally {
      setIsSyncing(false);
    }
  }, [isConnected]);

  const clearErrors = useCallback(() => {
    setSyncErrors([]);
  }, []);

  return {
    syncTask,
    syncTaskToGoogleTasks,
    syncAllTasks,
    isSyncing,
    syncErrors,
    clearErrors,
    isCalendarConnected: isConnected,
    refreshCalendarStatus: refreshStatus,
  };
}
