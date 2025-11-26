import { Calendar, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export function GoogleCalendarButton() {
  const { isConnected, connect, disconnect } = useGoogleCalendar();
  const { toast } = useToast();

  useEffect(() => {
    const handleConnection = () => {
      toast({
        title: "Conectado ao Google Calendar",
        description: "Suas tarefas serão sincronizadas automaticamente com seu calendário.",
      });
    };

    window.addEventListener('google-calendar-connected', handleConnection);
    return () => window.removeEventListener('google-calendar-connected', handleConnection);
  }, [toast]);

  const handleToggle = () => {
    if (isConnected) {
      disconnect();
      toast({
        title: "Desconectado do Google Calendar",
        description: "As tarefas não serão mais sincronizadas automaticamente.",
      });
    } else {
      connect();
    }
  };

  return (
    <Button
      onClick={handleToggle}
      variant={isConnected ? "default" : "outline"}
      size="sm"
      className="gap-2"
    >
      {isConnected ? (
        <>
          <CheckCircle2 className="h-4 w-4" />
          Conectado ao Google Calendar
        </>
      ) : (
        <>
          <Calendar className="h-4 w-4" />
          Conectar Google Calendar
        </>
      )}
    </Button>
  );
}
