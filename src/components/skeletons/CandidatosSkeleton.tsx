import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeletonGrid } from "./CardSkeleton";

export function CandidatosSkeleton() {
  return (
    <div 
      className="min-h-screen bg-background"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Carregando candidatos"
    >
      <span className="sr-only">Carregando candidatos...</span>
      
      {/* Header skeleton */}
      <div className="sticky top-0 z-20 bg-background border-b border-border shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <Skeleton className="h-9 w-36 mb-2" />
              <Skeleton className="h-5 w-64" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-36" />
              <Skeleton className="h-10 w-36" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
      </div>

      {/* Layout 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6">
        {/* Main column */}
        <div className="lg:col-span-4 space-y-4">
          {/* Tabs skeleton */}
          <Skeleton className="h-10 w-96" />
          
          {/* Filters skeleton */}
          <div className="flex items-center gap-2 w-full mt-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
          </div>

          {/* Cards container */}
          <div className="bg-muted/30 rounded-lg p-4 mt-4">
            <CardSkeletonGrid count={8} />
          </div>
        </div>

        {/* Sidebar skeleton */}
        <div className="lg:col-span-1 space-y-4">
          <Skeleton className="h-72 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
