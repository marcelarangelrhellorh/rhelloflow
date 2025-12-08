import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeletonGrid } from "./CardSkeleton";

interface PageSkeletonProps {
  variant?: 'cards' | 'table' | 'profile' | 'form';
}

export function PageSkeleton({ variant = 'cards' }: PageSkeletonProps) {
  const variantLabels = {
    cards: 'Carregando cards',
    table: 'Carregando tabela',
    profile: 'Carregando perfil',
    form: 'Carregando formulário'
  };

  return (
    <div 
      className="min-h-screen bg-background" 
      role="status" 
      aria-live="polite" 
      aria-busy="true"
      aria-label={variantLabels[variant]}
    >
      <span className="sr-only">{variantLabels[variant]}...</span>
      
      {/* Header skeleton */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 md:px-8 py-6 max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-72" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="px-6 md:px-8 py-8 max-w-[1400px] mx-auto">
        {/* Filters skeleton */}
        <div className="flex gap-4 mb-6">
          <Skeleton className="h-10 flex-1 max-w-md" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>

        {/* Content area */}
        {variant === 'cards' && <CardSkeletonGrid count={6} />}
        
        {variant === 'table' && (
          <div className="space-y-4" aria-label="Carregando linhas da tabela">
            <div className="rounded-md border">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              ))}
            </div>
          </div>
        )}

        {variant === 'form' && (
          <div className="max-w-2xl space-y-6" aria-label="Carregando campos do formulário">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
            <Skeleton className="h-10 w-32" />
          </div>
        )}
      </div>
    </div>
  );
}
