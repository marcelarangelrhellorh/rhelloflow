import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeletonGrid } from "./CardSkeleton";

export function VagasSkeleton() {
  return (
    <div 
      className="min-h-screen bg-background"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Carregando vagas"
    >
      <span className="sr-only">Carregando vagas...</span>
      
      {/* Header skeleton */}
      <div className="sticky top-0 z-20 bg-background border-b border-border shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-9 w-24 mb-2" />
              <Skeleton className="h-5 w-56" />
            </div>
            <Skeleton className="h-11 w-32" />
          </div>
        </div>
      </div>

      {/* Layout 2 columns */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main column */}
          <div className="lg:col-span-3 space-y-4">
            {/* Tabs skeleton */}
            <Skeleton className="h-10 w-96" />
            
            {/* Filters skeleton */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-[160px]" />
              <Skeleton className="h-10 w-[160px]" />
              <Skeleton className="h-10 w-[160px]" />
              <Skeleton className="h-10 w-[140px]" />
            </div>

            {/* Cards skeleton */}
            <div className="mt-4">
              <CardSkeletonGrid count={6} />
            </div>
          </div>

          {/* Sidebar skeleton */}
          <div className="lg:col-span-1 space-y-4">
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
