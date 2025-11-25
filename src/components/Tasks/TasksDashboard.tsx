import { AlertCircle, AlertTriangle, Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useOverdueTasks, usePriorityTasks } from "@/hooks/useTasks";
import { useUserRole } from "@/hooks/useUserRole";
import { Skeleton } from "@/components/ui/skeleton";

export default function TasksDashboard() {
  const { isAdmin } = useUserRole();
  const { data: overdueTasks, isLoading: loadingOverdue } = useOverdueTasks(isAdmin);
  const { data: highTasks, isLoading: loadingHigh } = usePriorityTasks("high", isAdmin);
  const { data: urgentTasks, isLoading: loadingUrgent } = usePriorityTasks("urgent", isAdmin);

  if (loadingOverdue || loadingHigh || loadingUrgent) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  const overdueCount = overdueTasks?.length || 0;
  const highCount = highTasks?.length || 0;
  const urgentCount = urgentTasks?.length || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Tarefas Atrasadas {isAdmin && "(Sistema)"}
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

      <Card className="border-orange-200 bg-orange-50/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Prioridade Alta {isAdmin && "(Sistema)"}
              </p>
              <h3 className="text-3xl font-bold text-orange-600 mt-2">
                {highCount}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-300 bg-red-100/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Prioridade Urgente {isAdmin && "(Sistema)"}
              </p>
              <h3 className="text-3xl font-bold text-red-700 mt-2">
                {urgentCount}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-200 flex items-center justify-center">
              <Flame className="h-6 w-6 text-red-700" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
