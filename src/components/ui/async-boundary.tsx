import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { ErrorState } from "./error-state";
import { ApiErrorCode, getApiErrorCode } from "@/lib/errorHandler";

interface AsyncBoundaryProps<T> {
  data: T | null | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry?: () => void;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
  emptyFallback?: ReactNode;
  children: (data: T) => ReactNode;
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-muted-foreground">Nenhum dado encontrado.</p>
    </div>
  );
}

export function AsyncBoundary<T>({ 
  data, 
  isLoading, 
  error, 
  onRetry, 
  loadingFallback, 
  errorFallback,
  emptyFallback,
  children 
}: AsyncBoundaryProps<T>) {
  if (isLoading) {
    return <>{loadingFallback ?? <LoadingSpinner />}</>;
  }
  
  if (error) {
    if (errorFallback) {
      return <>{errorFallback}</>;
    }
    
    const errorCode: ApiErrorCode = getApiErrorCode(error);
    return (
      <ErrorState 
        code={errorCode}
        message={error.message}
        onRetry={onRetry}
        showRetry={['NETWORK', 'SERVER', 'UNKNOWN'].includes(errorCode)}
      />
    );
  }
  
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return <>{emptyFallback ?? <EmptyState />}</>;
  }
  
  return <>{children(data)}</>;
}
