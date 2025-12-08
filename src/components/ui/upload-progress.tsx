import { Progress } from "./progress";
import { FileIcon, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadProgressProps {
  fileName: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  errorMessage?: string;
  className?: string;
}

export function UploadProgress({ 
  fileName, 
  progress, 
  status, 
  errorMessage,
  className 
}: UploadProgressProps) {
  return (
    <div className={cn("p-4 rounded-lg border bg-card", className)}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          status === 'uploading' && "bg-primary/10",
          status === 'success' && "bg-success/10",
          status === 'error' && "bg-destructive/10"
        )}>
          {status === 'uploading' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          {status === 'success' && <CheckCircle2 className="h-5 w-5 text-success" />}
          {status === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium truncate">{fileName}</p>
            {status === 'uploading' && (
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            )}
          </div>
          
          {status === 'uploading' && (
            <Progress value={progress} className="h-2" />
          )}
          
          {status === 'success' && (
            <p className="text-sm text-success">Upload concluído</p>
          )}
          
          {status === 'error' && (
            <p className="text-sm text-destructive">{errorMessage || 'Erro no upload'}</p>
          )}
        </div>
      </div>
    </div>
  );
}
