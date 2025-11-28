import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
}

interface UseGoogleCalendarReturn {
  isConnected: boolean;
  isLoading: boolean;
  lastSync: string | null;
  connectCalendar: () => Promise<void>;
  disconnectCalendar: () => Promise<void>;
  getEvents: (startDate: string, endDate: string) => Promise<GoogleCalendarEvent[]>;
  createEvent: (eventData: CreateEventData) => Promise<GoogleCalendarEvent | null>;
  updateEvent: (eventId: string, eventData: Partial<CreateEventData>) => Promise<GoogleCalendarEvent | null>;
  deleteEvent: (eventId: string) => Promise<boolean>;
  refreshStatus: () => Promise<void>;
}

interface CreateEventData {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  reminders?: {
    useDefault: boolean;
    overrides?: { method: string; minutes: number }[];
  };
}

export function useGoogleCalendar(): UseGoogleCalendarReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const getRedirectUri = useCallback(() => {
    return `${window.location.origin}/auth/google-callback`;
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsConnected(false);
        setLastSync(null);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('google-calendar-api', {
        body: { action: 'status' },
      });

      if (error) {
        console.error('Error fetching calendar status:', error);
        setIsConnected(false);
        setLastSync(null);
      } else {
        setIsConnected(data.connected || false);
        setLastSync(data.lastSync || null);
      }
    } catch (error) {
      console.error('Error refreshing status:', error);
      setIsConnected(false);
      setLastSync(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const connectCalendar = useCallback(async () => {
    try {
      setIsLoading(true);
      const redirectUri = getRedirectUri();

      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { redirectUri },
      });

      if (error) {
        console.error('Error getting auth URL:', error);
        toast.error('Erro ao iniciar conexão com Google Calendar');
        return;
      }

      if (data.authUrl) {
        // Store state in sessionStorage for validation
        sessionStorage.setItem('google_calendar_state', data.state);
        sessionStorage.setItem('google_calendar_redirect_uri', redirectUri);
        
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Error connecting calendar:', error);
      toast.error('Erro ao conectar Google Calendar');
    } finally {
      setIsLoading(false);
    }
  }, [getRedirectUri]);

  const disconnectCalendar = useCallback(async () => {
    try {
      setIsLoading(true);

      const { error } = await supabase.functions.invoke('google-calendar-api', {
        body: { action: 'disconnect' },
      });

      if (error) {
        console.error('Error disconnecting calendar:', error);
        toast.error('Erro ao desconectar Google Calendar');
        return;
      }

      setIsConnected(false);
      setLastSync(null);
      toast.success('Google Calendar desconectado com sucesso');
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      toast.error('Erro ao desconectar Google Calendar');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getEvents = useCallback(async (startDate: string, endDate: string): Promise<GoogleCalendarEvent[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-api', {
        body: { action: 'getEvents', startDate, endDate },
      });

      if (error) {
        console.error('Error fetching events:', error);
        toast.error('Erro ao buscar eventos do calendário');
        return [];
      }

      if (data.connected === false) {
        setIsConnected(false);
        toast.error('Sessão expirada. Por favor, reconecte o Google Calendar.');
        return [];
      }

      return data.items || [];
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Erro ao buscar eventos do calendário');
      return [];
    }
  }, []);

  const createEvent = useCallback(async (eventData: CreateEventData): Promise<GoogleCalendarEvent | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-api', {
        body: { action: 'createEvent', eventData },
      });

      if (error) {
        console.error('Error creating event:', error);
        toast.error('Erro ao criar evento no calendário');
        return null;
      }

      if (data.connected === false) {
        setIsConnected(false);
        toast.error('Sessão expirada. Por favor, reconecte o Google Calendar.');
        return null;
      }

      setLastSync(new Date().toISOString());
      toast.success('Evento criado no Google Calendar');
      return data;
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Erro ao criar evento no calendário');
      return null;
    }
  }, []);

  const updateEvent = useCallback(async (eventId: string, eventData: Partial<CreateEventData>): Promise<GoogleCalendarEvent | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-api', {
        body: { action: 'updateEvent', eventId, eventData },
      });

      if (error) {
        console.error('Error updating event:', error);
        toast.error('Erro ao atualizar evento no calendário');
        return null;
      }

      if (data.connected === false) {
        setIsConnected(false);
        toast.error('Sessão expirada. Por favor, reconecte o Google Calendar.');
        return null;
      }

      setLastSync(new Date().toISOString());
      toast.success('Evento atualizado no Google Calendar');
      return data;
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Erro ao atualizar evento no calendário');
      return null;
    }
  }, []);

  const deleteEvent = useCallback(async (eventId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-api', {
        body: { action: 'deleteEvent', eventId },
      });

      if (error) {
        console.error('Error deleting event:', error);
        toast.error('Erro ao excluir evento do calendário');
        return false;
      }

      if (data.connected === false) {
        setIsConnected(false);
        toast.error('Sessão expirada. Por favor, reconecte o Google Calendar.');
        return false;
      }

      setLastSync(new Date().toISOString());
      toast.success('Evento excluído do Google Calendar');
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Erro ao excluir evento do calendário');
      return false;
    }
  }, []);

  return {
    isConnected,
    isLoading,
    lastSync,
    connectCalendar,
    disconnectCalendar,
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    refreshStatus,
  };
}
