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
    const checkAuthAndToken = async () => {
      console.log('📅 Google Calendar: Verificando autenticação e tokens');
      console.log('📅 Google Calendar: URL atual:', window.location.href);
      console.log('📅 Google Calendar: Hash:', window.location.hash);
      
      // Primeiro, tentar restaurar sessão salva antes do OAuth
      const savedSession = sessionStorage.getItem("supabase_session_before_oauth");
      console.log('📅 Google Calendar: Sessão salva encontrada?', !!savedSession);
      
      if (savedSession) {
        console.log('🔄 Google Calendar: Restaurando sessão Supabase...');
        console.log('🔄 Google Calendar: Dados da sessão:', savedSession);
        try {
          const { access_token, refresh_token } = JSON.parse(savedSession);
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token
          });
          console.log('✅ Google Calendar: Resultado setSession:', { data, error });
          sessionStorage.removeItem("supabase_session_before_oauth");
          console.log('✅ Google Calendar: Sessão Supabase restaurada!');
        } catch (error) {
          console.error('❌ Google Calendar: Erro ao restaurar sessão:', error);
        }
      }
      
      // Verificar se usuário está autenticado no Supabase
      const { data: { session } } = await supabase.auth.getSession();
      console.log('📅 Google Calendar: Sessão Supabase:', session ? 'ATIVA' : 'INATIVA');
      
      if (!session) {
        console.log('⚠️ Google Calendar: SEM SESSÃO - salvando token se existir');
        // Se não há sessão, salvar token temporariamente se existir
        const params = new URLSearchParams(window.location.hash.substring(1));
        const token = params.get("access_token");
        
        if (token) {
          console.log('📅 Google Calendar: Token OAuth encontrado, salvando temporariamente');
          sessionStorage.setItem("pending_google_calendar_token", token);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        return;
      }

      console.log('✅ Google Calendar: Sessão ativa, processando tokens');
      
      // Verificar se há token pendente do OAuth
      const pendingToken = sessionStorage.getItem("pending_google_calendar_token");
      if (pendingToken) {
        console.log('📅 Google Calendar: Token pendente encontrado, aplicando');
        sessionStorage.removeItem("pending_google_calendar_token");
        localStorage.setItem("google_calendar_token", pendingToken);
        setAccessToken(pendingToken);
        setIsConnected(true);
        window.dispatchEvent(new CustomEvent('google-calendar-connected'));
        return;
      }

      // Verificar se retornou do OAuth
      const params = new URLSearchParams(window.location.hash.substring(1));
      const token = params.get("access_token");

      if (token) {
        console.log('📅 Google Calendar: Token OAuth na URL, salvando');
        localStorage.setItem("google_calendar_token", token);
        setAccessToken(token);
        setIsConnected(true);
        window.history.replaceState({}, document.title, window.location.pathname);
        window.dispatchEvent(new CustomEvent('google-calendar-connected'));
        return;
      }

      // Verificar se há token armazenado
      const storedToken = localStorage.getItem("google_calendar_token");
      if (storedToken) {
        console.log('📅 Google Calendar: Token armazenado encontrado');
        setAccessToken(storedToken);
        setIsConnected(true);
      } else {
        console.log('📅 Google Calendar: Nenhum token encontrado');
      }
    };

    checkAuthAndToken();
  }, []);

  const connect = () => {
    console.log("🔗 Redirect URI sendo usado:", REDIRECT_URI);
    console.log("🔑 Client ID:", GOOGLE_CLIENT_ID);
    
    // Salvar sessão atual antes do redirect
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("💾 Salvando informação da sessão antes do redirect OAuth:", session ? 'SESSÃO ATIVA' : 'SEM SESSÃO');
      if (session) {
        const sessionData = {
          access_token: session.access_token,
          refresh_token: session.refresh_token
        };
        console.log("💾 Dados da sessão a serem salvos:", sessionData);
        sessionStorage.setItem("supabase_session_before_oauth", JSON.stringify(sessionData));
        console.log("💾 Sessão salva no sessionStorage");
      } else {
        console.warn("⚠️ Nenhuma sessão ativa para salvar antes do OAuth");
      }
    });
    
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
    console.log("🚀 Iniciando redirect para Google OAuth...");
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
