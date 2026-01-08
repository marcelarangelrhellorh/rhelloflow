import { Skeleton } from "@/components/ui/skeleton";

function FunnelColumnSkeleton() {
  return (
    <div className="flex-shrink-0 w-72">
      <div className="bg-card rounded-lg border border-border p-3">
        {/* Column header */}
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        
        {/* Cards in column */}
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-background rounded-md border p-3">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-2" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FunnelSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div 
      className="flex gap-4 overflow-x-auto pb-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Carregando funil"
    >
      <span className="sr-only">Carregando colunas do funil...</span>
      {Array.from({ length: columns }).map((_, i) => (
        <FunnelColumnSkeleton key={i} />
      ))}
    </div>
  );
}
