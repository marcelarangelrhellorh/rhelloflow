import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const REDIRECT_URI = `${window.location.origin}/tarefas`;
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

interface GoogleCalendarHook {
  isConnected: boolean;
  accessToken: string | null;
  connect: () => void;
  disconnect: () => void;
}

export function useGoogleCalendar(): GoogleCalendarHook {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Verificar se há token armazenado
    const storedToken = localStorage.getItem("google_calendar_token");
    if (storedToken) {
      setAccessToken(storedToken);
      setIsConnected(true);
    }

    // Verificar se retornou do OAuth
    const params = new URLSearchParams(window.location.hash.substring(1));
    const token = params.get("access_token");

    if (token) {
      localStorage.setItem("google_calendar_token", token);
      setAccessToken(token);
      setIsConnected(true);
      // Limpar URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const connect = () => {
    console.log("🔗 Redirect URI sendo usado:", REDIRECT_URI);
    console.log("🔑 Client ID:", GOOGLE_CLIENT_ID);
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams(
      {
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: "token",
        scope: SCOPES,
        prompt: "consent",
      }
    )}`;

    console.log("🌐 URL completa:", authUrl);
    window.location.href = authUrl;
  };

  const disconnect = () => {
    localStorage.removeItem("google_calendar_token");
    setAccessToken(null);
    setIsConnected(false);
  };

  return {
    isConnected,
    accessToken,
    connect,
    disconnect,
  };
}

export async function syncTaskToGoogleCalendar(
  action: "create" | "update" | "delete",
  task: any,
  accessToken: string
) {
  try {
    const { data, error } = await supabase.functions.invoke(
      "sync-google-calendar",
      {
        body: {
          action,
          task,
          accessToken,
        },
      }
    );

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao sincronizar com Google Calendar:", error);
    throw error;
  }
}
