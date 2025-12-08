import { AlertCircle, RefreshCw, WifiOff, Lock, ServerCrash, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ApiErrorCode } from "@/lib/errorHandler";

interface ErrorStateProps {
  title?: string;
  message?: string;
  code?: ApiErrorCode;
  onRetry?: () => void;
  showRetry?: boolean;
  compact?: boolean;
}

const ERROR_ICONS: Record<ApiErrorCode, React.ReactNode> = {
  NETWORK: <WifiOff className="h-12 w-12 text-destructive" />,
  AUTH: <Lock className="h-12 w-12 text-destructive" />,
  FORBIDDEN: <Lock className="h-12 w-12 text-destructive" />,
  NOT_FOUND: <Search className="h-12 w-12 text-muted-foreground" />,
  SERVER: <ServerCrash className="h-12 w-12 text-destructive" />,
  VALIDATION: <AlertCircle className="h-12 w-12 text-warning" />,
  UNKNOWN: <AlertCircle className="h-12 w-12 text-destructive" />,
};

const ERROR_TITLES: Record<ApiErrorCode, string> = {
  NETWORK: "Sem conexão",
  AUTH: "Sessão expirada",
  FORBIDDEN: "Acesso negado",
  NOT_FOUND: "Não encontrado",
  SERVER: "Erro no servidor",
  VALIDATION: "Dados inválidos",
  UNKNOWN: "Algo deu errado",
};

export function ErrorState({ 
  title, 
  message, 
  code = 'UNKNOWN',
  onRetry, 
  showRetry = true,
  compact = false 
}: ErrorStateProps) {
  const displayTitle = title || ERROR_TITLES[code];
  const displayMessage = message || "Não foi possível completar a operação.";
  const icon = ERROR_ICONS[code];
  
  // Mostrar retry apenas para erros recuperáveis
  const canRetry = showRetry && onRetry && ['NETWORK', 'SERVER', 'UNKNOWN'].includes(code);

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
        <p className="text-sm text-foreground flex-1">{displayMessage}</p>
        {canRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-3 w-3" />
            Tentar novamente
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="border-destructive/20">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4">
          {icon}
        </div>
        <h3 className="font-semibold text-lg mb-2 text-foreground">{displayTitle}</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">{displayMessage}</p>
        {canRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
