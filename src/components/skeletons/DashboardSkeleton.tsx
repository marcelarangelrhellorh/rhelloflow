import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

function KPICardSkeleton() {
  return (
    <Card className="overflow-hidden border-l-4 border-l-muted">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-14 w-14 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div 
      className="min-h-screen bg-background"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Carregando dashboard"
    >
      <span className="sr-only">Carregando dashboard...</span>
      
      {/* Header skeleton */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 max-w-[1400px] mx-auto">
          <div className="flex flex-col gap-4 mb-4 sm:mb-6">
            <div>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-5 w-64" />
            </div>
            
            {/* Filters skeleton */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Skeleton className="h-10 w-full sm:w-[180px]" />
              <Skeleton className="h-10 w-full sm:w-[180px]" />
              <Skeleton className="h-10 w-full sm:w-[180px]" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-8 max-w-[1400px] mx-auto">
        {/* Quick actions skeleton */}
        <div className="mb-4 sm:mb-6">
          <Skeleton className="h-5 w-28 mb-2" />
          <Skeleton className="h-11 w-44" />
        </div>

        {/* KPI Cards Grid skeleton */}
        <div className="grid gap-3 sm:gap-6 mb-6 sm:mb-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
