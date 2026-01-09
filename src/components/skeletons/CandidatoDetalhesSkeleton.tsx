import { Skeleton } from "@/components/ui/skeleton";

export function CandidatoDetalhesSkeleton() {
  return (
    <div className="min-h-screen w-full font-display" style={{ backgroundColor: '#FFFBF0' }}>
      {/* Breadcrumb */}
      <div className="sticky top-0 z-10 backdrop-blur-sm border-b border-gray-200" style={{ backgroundColor: 'rgba(255, 251, 240, 0.95)' }}>
        <div className="px-6 py-2 bg-white">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
            <span className="mx-1 text-muted-foreground">/</span>
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>

      {/* Content with Sidebar Layout */}
      <div className="flex flex-1">
        {/* Main Content */}
        <main className="flex-1 px-6 py-6 bg-white">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-7 w-48" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-9 w-32" />
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3 rounded-lg border bg-card">
                  <Skeleton className="h-3 w-20 mb-1" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>

            {/* Tags */}
            <div className="rounded-lg border bg-card p-4">
              <Skeleton className="h-5 w-16 mb-3" />
              <div className="flex gap-2 flex-wrap">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>

            {/* Professional Info Card */}
            <div className="rounded-lg border bg-card p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>

            {/* Feedbacks and WhatsApp History Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Feedbacks */}
              <div className="rounded-lg border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-9 w-28" />
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-3 rounded border">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  ))}
                </div>
              </div>

              {/* WhatsApp History */}
              <div className="rounded-lg border bg-card p-6">
                <Skeleton className="h-6 w-36 mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-3 rounded border">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Scorecards and Timeline Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                {/* Scorecards */}
                <div className="rounded-lg border bg-card p-6">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <Skeleton className="h-24 w-full" />
                </div>

                {/* Scorecard History */}
                <div className="rounded-lg border bg-card p-6">
                  <Skeleton className="h-6 w-40 mb-4" />
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </div>
              </div>

              {/* History Timeline */}
              <div className="rounded-lg border bg-card p-6">
                <Skeleton className="h-6 w-24 mb-4" />
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-3 w-3 rounded-full mt-1" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="hidden lg:block w-96 border-l border-gray-200 bg-white overflow-y-auto shadow-lg">
          <div className="sticky top-0 p-4 space-y-4">
            {/* Meetings Card */}
            <div className="rounded-lg border bg-card p-4 shadow-lg">
              <Skeleton className="h-5 w-24 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="p-3 rounded border">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-9 w-full mt-4" />
            </div>

            {/* Notes Section */}
            <div className="rounded-lg border bg-card p-4">
              <Skeleton className="h-5 w-20 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
