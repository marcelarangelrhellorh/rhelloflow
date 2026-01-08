import { Skeleton } from "@/components/ui/skeleton";

export function LayoutSkeleton() {
  return (
    <div 
      className="min-h-screen flex w-full"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Carregando aplicação"
    >
      <span className="sr-only">Carregando...</span>
      
      {/* Sidebar skeleton - desktop only */}
      <aside className="hidden md:flex w-16 flex-col border-r border-border bg-card/50">
        <div className="p-3 flex justify-center">
          <Skeleton className="h-8 w-8" />
        </div>
        <div className="flex-1 p-2 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-10 mx-auto" />
          ))}
        </div>
      </aside>
      
      {/* Main content skeleton */}
      <main className="flex-1 min-h-screen bg-background">
        {/* Header skeleton */}
        <div className="border-b border-border bg-card/50 sticky top-0 z-10">
          <div className="px-6 py-6 max-w-[1400px] mx-auto">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-5 w-72" />
          </div>
        </div>
        
        {/* Content skeleton */}
        <div className="px-6 py-8 max-w-[1400px] mx-auto">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
