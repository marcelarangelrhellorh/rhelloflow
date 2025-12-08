import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function ConnectionIndicator() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Check initial connection
    checkConnection();

    // Check connection periodically
    const interval = setInterval(checkConnection, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    try {
      const { error } = await supabase.from("profiles").select("id").limit(1);
      setIsConnected(!error);
    } catch (error) {
      setIsConnected(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className="flex items-center justify-center"
            role="status"
            aria-label={isConnected ? "Conectado ao banco de dados" : "Sem conexão com o banco de dados"}
            aria-live="polite"
          >
            <div
              className={`h-2 w-2 rounded-full ${
                isConnected
                  ? "bg-success animate-pulse"
                  : "bg-destructive"
              }`}
              aria-hidden="true"
            />
            <span className="sr-only">
              {isConnected ? "Conectado" : "Desconectado"}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isConnected ? "Conectado ao banco de dados" : "Sem conexão"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
