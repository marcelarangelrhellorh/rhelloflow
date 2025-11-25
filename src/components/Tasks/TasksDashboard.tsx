import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useOverdueTasks } from "@/hooks/useTasks";
import { Skeleton } from "@/components/ui/skeleton";

export default function TasksDashboard() {
  const { data: overdueTasks, isLoading } = useOverdueTasks();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Skeleton className="h-24" />
      </div>
    );
  }

  const overdueCount = overdueTasks?.length || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Tarefas Atrasadas
              </p>
              <h3 className="text-3xl font-bold text-red-600 mt-2">
                {overdueCount}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
