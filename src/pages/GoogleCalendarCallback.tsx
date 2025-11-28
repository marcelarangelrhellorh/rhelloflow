import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type CallbackStatus = 'processing' | 'success' | 'error';

export default function GoogleCalendarCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      // Check for OAuth errors
      if (error) {
        console.error('OAuth error:', error);
        setStatus('error');
        setErrorMessage(
          error === 'access_denied'
            ? 'Acesso negado. Você cancelou a autorização.'
            : `Erro de autenticação: ${error}`
        );
        return;
      }

      if (!code) {
        setStatus('error');
        setErrorMessage('Código de autorização não encontrado.');
        return;
      }

      // Validate state
      const savedState = sessionStorage.getItem('google_calendar_state');
      const redirectUri = sessionStorage.getItem('google_calendar_redirect_uri');

      if (!savedState || savedState !== state) {
        console.error('State mismatch');
        setStatus('error');
        setErrorMessage('Erro de validação. Por favor, tente novamente.');
        return;
      }

      try {
        // Exchange code for tokens
        const { data, error: callbackError } = await supabase.functions.invoke('google-calendar-callback', {
          body: { code, redirectUri, state },
        });

        if (callbackError) {
          console.error('Callback error:', callbackError);
          setStatus('error');
          setErrorMessage('Erro ao conectar com o Google Calendar. Por favor, tente novamente.');
          return;
        }

        if (data.error) {
          console.error('API error:', data.error);
          setStatus('error');
          setErrorMessage(data.error);
          return;
        }

        // Clean up session storage
        sessionStorage.removeItem('google_calendar_state');
        sessionStorage.removeItem('google_calendar_redirect_uri');

        setStatus('success');

        // Redirect after success
        setTimeout(() => {
          navigate('/tarefas', { replace: true });
        }, 2000);
      } catch (err) {
        console.error('Unexpected error:', err);
        setStatus('error');
        setErrorMessage('Erro inesperado. Por favor, tente novamente.');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === 'processing' && (
            <>
              <div className="flex justify-center mb-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </div>
              <CardTitle>Conectando ao Google Calendar</CardTitle>
              <CardDescription>
                Aguarde enquanto processamos sua autorização...
              </CardDescription>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center mb-4">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle className="text-green-700">Conectado com sucesso!</CardTitle>
              <CardDescription>
                Seu Google Calendar foi conectado. Redirecionando...
              </CardDescription>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center mb-4">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="text-destructive">Erro na conexão</CardTitle>
              <CardDescription>{errorMessage}</CardDescription>
            </>
          )}
        </CardHeader>

        {status === 'error' && (
          <CardContent className="flex flex-col gap-2">
            <Button onClick={() => navigate('/tarefas')} variant="default">
              Voltar para Tarefas
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline">
              Tentar novamente
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
