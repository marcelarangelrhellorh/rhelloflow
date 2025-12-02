import { useState } from "react";
import { AlertCircle, AlertTriangle, Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useOverdueTasks, usePriorityTasks, Task } from "@/hooks/useTasks";
import { useUserRole } from "@/hooks/useUserRole";
import { Skeleton } from "@/components/ui/skeleton";
import TaskListDrawer from "./TaskListDrawer";
type DrawerType = "overdue" | "high" | "urgent" | null;
interface TasksDashboardProps {
  onTaskClick?: (task: Task) => void;
}
export default function TasksDashboard({
  onTaskClick
}: TasksDashboardProps) {
  const {
    isAdmin
  } = useUserRole();
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);
  const {
    data: overdueTasks,
    isLoading: loadingOverdue
  } = useOverdueTasks(isAdmin);
  const {
    data: highTasks,
    isLoading: loadingHigh
  } = usePriorityTasks("high", isAdmin);
  const {
    data: urgentTasks,
    isLoading: loadingUrgent
  } = usePriorityTasks("urgent", isAdmin);
  if (loadingOverdue || loadingHigh || loadingUrgent) {
    return <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>;
  }
  const overdueCount = overdueTasks?.length || 0;
  const highCount = highTasks?.length || 0;
  const urgentCount = urgentTasks?.length || 0;
  const handleTaskClick = (task: Task) => {
    setActiveDrawer(null);
    onTaskClick?.(task);
  };
  const getDrawerData = () => {
    switch (activeDrawer) {
      case "overdue":
        return {
          title: `Tarefas Atrasadas${isAdmin ? " (Geral)" : ""}`,
          tasks: overdueTasks || []
        };
      case "high":
        return {
          title: `Prioridade Alta${isAdmin ? " (Geral)" : ""}`,
          tasks: highTasks || []
        };
      case "urgent":
        return {
          title: `Prioridade Urgente${isAdmin ? " (Geral)" : ""}`,
          tasks: urgentTasks || []
        };
      default:
        return {
          title: "",
          tasks: []
        };
    }
  };
  const drawerData = getDrawerData();
  return <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 max-w-3xl">
        <Card className="border-red-200 bg-red-50/50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveDrawer("overdue")}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-muted-foreground text-xs font-semibold">
                  Tarefas Atrasadas {isAdmin && "(Geral)"}
                </p>
                <h3 className="text-xl font-bold text-red-600 mt-1">
                  {overdueCount}
                </h3>
              </div>
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveDrawer("high")}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-muted-foreground text-xs font-semibold">
                  Prioridade Alta {isAdmin && "(Geral)"}
                </p>
                <h3 className="text-xl font-bold text-orange-600 mt-1">
                  {highCount}
                </h3>
              </div>
              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-300 bg-red-100/50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveDrawer("urgent")}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-muted-foreground text-xs font-semibold">
                  Prioridade Urgente {isAdmin && "(Geral)"}
                </p>
                <h3 className="text-xl font-bold text-red-700 mt-1">
                  {urgentCount}
                </h3>
              </div>
              <div className="h-8 w-8 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0">
                <Flame className="h-4 w-4 text-red-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <TaskListDrawer open={activeDrawer !== null} onClose={() => setActiveDrawer(null)} title={drawerData.title} tasks={drawerData.tasks} onTaskClick={handleTaskClick} />
    </>;
}